import { describe, it, expect, beforeEach } from 'vitest';
import { HttpException } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import {
  WompiPaymentAdapter,
  PaymentProcessorService,
  ProvisioningOrchestrator,
  SubscriptionService,
  ProductCatalogService,
  ProductCategory,
  BillingCycle,
  Order,
  OrderStatus,
  InvalidWebhookSignatureError,
} from '@cloudfly/domain';

describe('WebhooksController (Authenticated Wompi Webhooks & Commerce Engine)', () => {
  const eventsSecret = 'test_webhook_events_secret_777';
  const integritySecret = 'test_integrity_secret_888';

  let adapter: WompiPaymentAdapter;
  let catalog: ProductCatalogService;
  let orchestrator: ProvisioningOrchestrator;
  let subscriptionService: SubscriptionService;
  let ordersStore: Map<string, Order>;
  let paymentProcessor: PaymentProcessorService;
  let controller: WebhooksController;
  let testOrder: Order;

  beforeEach(() => {
    adapter = new WompiPaymentAdapter({
      publicKey: 'pub_test_wompi',
      privateKey: 'prv_test_wompi',
      integritySecret,
      eventsSecret,
      isSandbox: true,
    });

    catalog = new ProductCatalogService();
    const prod = catalog.createProduct({
      name: 'Cloud Apps Hosting',
      code: 'cloud-apps',
      category: ProductCategory.CLOUD_APPS,
    });
    const plan = catalog.createPlan({
      productId: prod.id,
      name: 'Apps Pro',
      code: 'apps-pro',
      infrastructureMode: 'SHARED',
    });
    const pv = catalog.publishPlanVersion({
      planId: plan.id,
      version: 1,
      quotas: {
        cpuMilli: 2000,
        memoryMb: 4096,
        diskMb: 20480,
        bandwidthMb: 100000,
        maxApps: 5,
        maxDomains: 5,
        maxDatabases: 5,
        hermesAccess: false,
      },
      prices: [{ currency: 'COP', billingCycle: BillingCycle.MONTHLY, priceCents: 5500000 }],
      effectiveFrom: new Date('2026-01-01'),
    });

    testOrder = {
      id: 'ord-wompi-test-01',
      organizationId: 'org-tenant-wompi',
      orderNumber: 'VEL-WOMPI-01',
      status: OrderStatus.PENDING_PAYMENT,
      currency: 'COP',
      subtotalCents: 5500000,
      taxCents: 1045000,
      totalCents: 6545000,
      items: [
        {
          id: 'item-1',
          orderId: 'ord-wompi-test-01',
          planVersionId: pv.id,
          billingCycle: BillingCycle.MONTHLY,
          unitPriceCents: 5500000,
          quantity: 1,
        },
      ],
      idempotencyKey: 'idem-wompi-test-01',
      createdAt: new Date(),
    };

    ordersStore = new Map([[testOrder.id, { ...testOrder }]]);
    paymentProcessor = new PaymentProcessorService(adapter, ordersStore);
    orchestrator = new ProvisioningOrchestrator(catalog);
    subscriptionService = new SubscriptionService();

    controller = new WebhooksController(paymentProcessor, orchestrator, subscriptionService);
  });

  it('rejects webhooks with invalid or missing HMAC signature', () => {
    const payload = {
      event: 'transaction.updated',
      data: {
        transaction: {
          id: 'trx-invalid-sig',
          reference: testOrder.id,
          status: 'APPROVED',
          amount_in_cents: testOrder.totalCents,
          currency: 'COP',
        },
      },
      timestamp: 1776080000,
    };

    expect(() => {
      controller.handleWompiWebhook(payload, { 'x-event-checksum': 'bad-signature' });
    }).toThrow(HttpException);
  });

  it('processes verified APPROVED webhook: updates order to PAID, triggers provisioning, subscription & invoice', () => {
    const payload = {
      event: 'transaction.updated',
      data: {
        transaction: {
          id: 'trx-approved-999',
          reference: testOrder.id,
          status: 'APPROVED',
          amount_in_cents: testOrder.totalCents,
          currency: 'COP',
        },
      },
      timestamp: 1776080000,
    };

    const signature = adapter.generateTestSignature(payload, eventsSecret);
    const result = controller.handleWompiWebhook(payload, { 'x-event-checksum': signature });

    expect(result.status).toBe('PROCESSED');
    expect(result.orderId).toBe(testOrder.id);

    // Verify order updated in store
    const updatedOrder = ordersStore.get(testOrder.id);
    expect(updatedOrder?.status).toBe(OrderStatus.PAID);

    // Verify subscription created
    const subs = subscriptionService.getSubscriptionsByOrganization('org-tenant-wompi');
    expect(subs.length).toBe(1);
    expect(subs[0].status).toBe('ACTIVE');
    expect(subs[0].orderId).toBe(testOrder.id);

    // Verify invoice generated
    const invoices = subscriptionService.getInvoicesByOrganization('org-tenant-wompi');
    expect(invoices.length).toBe(1);
    expect(invoices[0].status).toBe('PAID');
    expect(invoices[0].totalCents).toBe(testOrder.totalCents);
  });

  it('processes verified DECLINED webhook: updates order to FAILED without provisioning', () => {
    const payload = {
      event: 'transaction.updated',
      data: {
        transaction: {
          id: 'trx-declined-888',
          reference: testOrder.id,
          status: 'DECLINED',
          amount_in_cents: testOrder.totalCents,
          currency: 'COP',
        },
      },
      timestamp: 1776080000,
    };

    const signature = adapter.generateTestSignature(payload, eventsSecret);
    const result = controller.handleWompiWebhook(payload, { 'x-event-checksum': signature });

    expect(result.status).toBe('PROCESSED');
    expect(result.orderId).toBe(testOrder.id);

    const updatedOrder = ordersStore.get(testOrder.id);
    expect(updatedOrder?.status).toBe(OrderStatus.FAILED);

    // No subscription or invoice created
    const subs = subscriptionService.getSubscriptionsByOrganization('org-tenant-wompi');
    expect(subs.length).toBe(0);
  });

  it('is strictly idempotent: duplicate webhooks do not duplicate subscriptions or invoices', () => {
    const payload = {
      event: 'transaction.updated',
      data: {
        transaction: {
          id: 'trx-idempotent-777',
          reference: testOrder.id,
          status: 'APPROVED',
          amount_in_cents: testOrder.totalCents,
          currency: 'COP',
        },
      },
      timestamp: 1776080000,
    };

    const signature = adapter.generateTestSignature(payload, eventsSecret);

    // First call
    controller.handleWompiWebhook(payload, { 'x-event-checksum': signature });
    // Duplicate call
    const dupResult = controller.handleWompiWebhook(payload, { 'x-event-checksum': signature });

    expect(dupResult.status).toBe('PROCESSED');

    const subs = subscriptionService.getSubscriptionsByOrganization('org-tenant-wompi');
    expect(subs.length).toBe(1);

    const invoices = subscriptionService.getInvoicesByOrganization('org-tenant-wompi');
    expect(invoices.length).toBe(1);
  });
});

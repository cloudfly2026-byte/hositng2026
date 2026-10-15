import { describe, it, expect, beforeEach } from 'vitest';
import { BillingController } from './billing.controller';
import {
  SubscriptionService,
  OrderService,
  ProductCatalogService,
  ProductCategory,
  BillingCycle,
  OrderStatus,
  WompiPaymentAdapter,
  PaymentProcessorService,
  ProvisioningOrchestrator,
} from '@cloudfly/domain';
import { AuthorizedContext } from '@cloudfly/contracts';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('BillingController (API Subscriptions & Invoicing)', () => {
  let catalog: ProductCatalogService;
  let orderService: OrderService;
  let subscriptionService: SubscriptionService;
  let paymentProcessor: PaymentProcessorService;
  let orchestrator: ProvisioningOrchestrator;
  let controller: BillingController;
  let planVersionId: string;

  const tenantAContext: AuthorizedContext = {
    userId: 'usr-1',
    organizationId: 'org-tenant-a',
    roles: ['OWNER'],
    permissions: ['*'],
  };

  const tenantBContext: AuthorizedContext = {
    userId: 'usr-2',
    organizationId: 'org-tenant-b',
    roles: ['DEVELOPER'],
    permissions: ['services:read'],
  };

  beforeEach(() => {
    catalog = new ProductCatalogService();
    const prod = catalog.createProduct({
      name: 'Velupi VPS',
      code: 'velupi-vps',
      category: ProductCategory.VPS,
    });
    const plan = catalog.createPlan({
      productId: prod.id,
      name: 'VPS Pro',
      code: 'vps-pro',
      infrastructureMode: 'DEDICATED',
    });
    const pv = catalog.publishPlanVersion({
      planId: plan.id,
      version: 1,
      quotas: {
        cpuMilli: 4000,
        memoryMb: 8192,
        diskMb: 102400,
        bandwidthMb: 500000,
        maxApps: 20,
        maxDomains: 20,
        maxDatabases: 20,
        hermesAccess: true,
      },
      prices: [
        { currency: 'COP', billingCycle: BillingCycle.MONTHLY, priceCents: 15000000 },
      ],
      effectiveFrom: new Date('2026-01-01'),
    });
    planVersionId = pv.id;

    orderService = new OrderService(catalog);
    subscriptionService = new SubscriptionService();
    const adapter = new WompiPaymentAdapter({
      publicKey: 'pub_test',
      privateKey: 'prv_test',
      integritySecret: 'sec_int',
      eventsSecret: 'sec_evt',
      isSandbox: true,
    });
    const ordersMap = (orderService as any).orders;
    paymentProcessor = new PaymentProcessorService(adapter, ordersMap);
    orchestrator = new ProvisioningOrchestrator(catalog);
    controller = new BillingController(subscriptionService, paymentProcessor, orderService, orchestrator);
  });

  it('lists subscriptions strictly scoped to the requesting tenant', async () => {
    // Seed order & subscription for Tenant A
    const orderA = orderService.createOrder({
      organizationId: 'org-tenant-a',
      currency: 'COP',
      billingCycle: BillingCycle.MONTHLY,
      items: [{ planVersionId, quantity: 1 }],
      idempotencyKey: 'idem-sub-a',
    });
    orderA.status = OrderStatus.PAID;
    subscriptionService.createSubscriptionFromPaidOrder(orderA);

    // Seed order & subscription for Tenant B
    const orderB = orderService.createOrder({
      organizationId: 'org-tenant-b',
      currency: 'COP',
      billingCycle: BillingCycle.MONTHLY,
      items: [{ planVersionId, quantity: 1 }],
      idempotencyKey: 'idem-sub-b',
    });
    orderB.status = OrderStatus.PAID;
    subscriptionService.createSubscriptionFromPaidOrder(orderB);

    const subsA = await controller.getSubscriptions(tenantAContext);
    expect(subsA.length).toBe(1);
    expect(subsA[0].organizationId).toBe('org-tenant-a');

    const subsB = await controller.getSubscriptions(tenantBContext);
    expect(subsB.length).toBe(1);
    expect(subsB[0].organizationId).toBe('org-tenant-b');
  });

  it('lists invoices strictly scoped to the requesting tenant', async () => {
    const orderA = orderService.createOrder({
      organizationId: 'org-tenant-a',
      currency: 'COP',
      billingCycle: BillingCycle.MONTHLY,
      items: [{ planVersionId, quantity: 1 }],
      idempotencyKey: 'idem-inv-a',
    });
    orderA.status = OrderStatus.PAID;
    subscriptionService.generateInvoiceForOrder(orderA);

    const invoicesA = await controller.getInvoices(tenantAContext);
    expect(invoicesA.length).toBe(1);
    expect(invoicesA[0].organizationId).toBe('org-tenant-a');

    const invoicesB = await controller.getInvoices(tenantBContext);
    expect(invoicesB.length).toBe(0);
  });

  it('retrieves an invoice detail by ID when owned by the tenant', async () => {
    const orderA = orderService.createOrder({
      organizationId: 'org-tenant-a',
      currency: 'COP',
      billingCycle: BillingCycle.MONTHLY,
      items: [{ planVersionId, quantity: 1 }],
      idempotencyKey: 'idem-inv-detail',
    });
    orderA.status = OrderStatus.PAID;
    const inv = subscriptionService.generateInvoiceForOrder(orderA);

    const result = await controller.getInvoiceById(inv.id, tenantAContext);
    expect(result.id).toBe(inv.id);
    expect(result.invoiceNumber).toBe(inv.invoiceNumber);
  });

  it('throws ForbiddenException when accessing an invoice of another tenant (cross-tenant security)', async () => {
    const orderA = orderService.createOrder({
      organizationId: 'org-tenant-a',
      currency: 'COP',
      billingCycle: BillingCycle.MONTHLY,
      items: [{ planVersionId, quantity: 1 }],
      idempotencyKey: 'idem-cross-inv',
    });
    orderA.status = OrderStatus.PAID;
    const inv = subscriptionService.generateInvoiceForOrder(orderA);

    // Tenant B attempts to access Tenant A's invoice
    await expect(controller.getInvoiceById(inv.id, tenantBContext)).rejects.toThrow(
      ForbiddenException
    );
  });

  it('throws NotFoundException when invoice does not exist', async () => {
    await expect(controller.getInvoiceById('non-existent-inv', tenantAContext)).rejects.toThrow(
      NotFoundException
    );
  });

  it('cancels subscription and prevents cross-tenant cancellation', async () => {
    const orderA = orderService.createOrder({
      organizationId: 'org-tenant-a',
      currency: 'COP',
      billingCycle: BillingCycle.MONTHLY,
      items: [{ planVersionId, quantity: 1 }],
      idempotencyKey: 'idem-cancel-sub',
    });
    orderA.status = OrderStatus.PAID;
    const subA = subscriptionService.createSubscriptionFromPaidOrder(orderA);

    // Tenant B cannot cancel Tenant A's subscription
    await expect(controller.cancelSubscription(subA.id, tenantBContext)).rejects.toThrow(
      ForbiddenException
    );

    // Tenant A cancels successfully
    const cancelled = await controller.cancelSubscription(subA.id, tenantAContext);
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.cancelledAt).toBeDefined();
  });

  describe('Subscription Evaluation & Grace Period Management', () => {
    it('evaluates subscription and enters GRACE_PERIOD within 5 days of expiry', async () => {
      const orderA = orderService.createOrder({
        organizationId: 'org-tenant-a',
        currency: 'COP',
        billingCycle: BillingCycle.MONTHLY,
        items: [{ planVersionId, quantity: 1 }],
        idempotencyKey: 'idem-eval-sub-1',
      });
      orderA.status = OrderStatus.PAID;
      const subA = subscriptionService.createSubscriptionFromPaidOrder(orderA);

      // Fast forward past currentPeriodEnd (e.g. 32 days later)
      const testDate = new Date(subA.currentPeriodStart.getTime() + 1000 * 60 * 60 * 24 * 32);
      const evaluated = await controller.evaluateSubscription(subA.id, tenantAContext, testDate.toISOString());

      expect(evaluated.status).toBe('GRACE_PERIOD');
      expect(evaluated.gracePeriodUntil).toBeDefined();
    });

    it('evaluates subscription and enters non-destructive SUSPENDED status after grace period expires', async () => {
      const orderA = orderService.createOrder({
        organizationId: 'org-tenant-a',
        currency: 'COP',
        billingCycle: BillingCycle.MONTHLY,
        items: [{ planVersionId, quantity: 1 }],
        idempotencyKey: 'idem-eval-sub-2',
      });
      orderA.status = OrderStatus.PAID;
      const subA = subscriptionService.createSubscriptionFromPaidOrder(orderA);

      // Fast forward past grace period (e.g. 38 days later)
      const testDate = new Date(subA.currentPeriodStart.getTime() + 1000 * 60 * 60 * 24 * 38);
      const evaluated = await controller.evaluateSubscription(subA.id, tenantAContext, testDate.toISOString());

      expect(evaluated.status).toBe('SUSPENDED');
      expect(evaluated.suspendedAt).toBeDefined();
    });

    it('prevents cross-tenant subscription evaluation', async () => {
      const orderA = orderService.createOrder({
        organizationId: 'org-tenant-a',
        currency: 'COP',
        billingCycle: BillingCycle.MONTHLY,
        items: [{ planVersionId, quantity: 1 }],
        idempotencyKey: 'idem-cross-eval',
      });
      orderA.status = OrderStatus.PAID;
      const subA = subscriptionService.createSubscriptionFromPaidOrder(orderA);

      await expect(
        controller.evaluateSubscription(subA.id, tenantBContext)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Subscription Reactivation', () => {
    it('reactivates a suspended subscription when paid renewal order is provided', async () => {
      const initialOrder = orderService.createOrder({
        organizationId: 'org-tenant-a',
        currency: 'COP',
        billingCycle: BillingCycle.MONTHLY,
        items: [{ planVersionId, quantity: 1 }],
        idempotencyKey: 'idem-react-init',
      });
      initialOrder.status = OrderStatus.PAID;
      const sub = subscriptionService.createSubscriptionFromPaidOrder(initialOrder);

      // Force suspend
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 40);
      subscriptionService.evaluateSubscriptionStatus(sub.id, futureDate);

      // Create paid renewal order
      const renewalOrder = orderService.createOrder({
        organizationId: 'org-tenant-a',
        currency: 'COP',
        billingCycle: BillingCycle.MONTHLY,
        items: [{ planVersionId, quantity: 1 }],
        idempotencyKey: 'idem-react-renewal',
      });
      renewalOrder.status = OrderStatus.PAID;

      const reactivated = await controller.reactivateSubscription(
        sub.id,
        { renewalOrderId: renewalOrder.id },
        tenantAContext
      );

      expect(reactivated.status).toBe('ACTIVE');
      expect(reactivated.suspendedAt).toBeNull();
      expect(reactivated.gracePeriodUntil).toBeNull();
    });

    it('prevents cross-tenant reactivation of subscriptions', async () => {
      const orderA = orderService.createOrder({
        organizationId: 'org-tenant-a',
        currency: 'COP',
        billingCycle: BillingCycle.MONTHLY,
        items: [{ planVersionId, quantity: 1 }],
        idempotencyKey: 'idem-cross-react',
      });
      orderA.status = OrderStatus.PAID;
      const sub = subscriptionService.createSubscriptionFromPaidOrder(orderA);

      await expect(
        controller.reactivateSubscription(sub.id, { renewalOrderId: 'ord-dummy' }, tenantBContext)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Payment Reconciliation Endpoint', () => {
    it('reconciles a pending order when provider transaction is APPROVED', async () => {
      const pendingOrder = orderService.createOrder({
        organizationId: 'org-tenant-a',
        currency: 'COP',
        billingCycle: BillingCycle.MONTHLY,
        items: [{ planVersionId, quantity: 1 }],
        idempotencyKey: 'idem-reconcile-api-1',
      });

      const result = await controller.reconcileOrder(
        { orderId: pendingOrder.id, transactionId: 'trx-reconcile-approved-1' },
        tenantAContext
      );

      expect(result.status).toBe('RECONCILED_PAID');
      expect(result.order.status).toBe(OrderStatus.PAID);
    });

    it('rejects cross-tenant reconciliation attempts', async () => {
      const pendingOrder = orderService.createOrder({
        organizationId: 'org-tenant-a',
        currency: 'COP',
        billingCycle: BillingCycle.MONTHLY,
        items: [{ planVersionId, quantity: 1 }],
        idempotencyKey: 'idem-cross-reconcile',
      });

      await expect(
        controller.reconcileOrder(
          { orderId: pendingOrder.id, transactionId: 'trx-123' },
          tenantBContext
        )
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { CheckoutController, CreateOrderDto } from './checkout.controller';
import {
  ProductCatalogService,
  ProductCategory,
  BillingCycle,
  OrderService,
  WompiPaymentAdapter,
  OrderStatus,
} from '@cloudfly/domain';

describe('CheckoutController (API Order & Payment Workflow)', () => {
  // Pre-seed catalog
  const catalog = new ProductCatalogService();
  const wpProd = catalog.createProduct({
    name: 'Velupi WordPress',
    code: 'velupi-wp',
    category: ProductCategory.WORDPRESS,
  });

  const wpPlan = catalog.createPlan({
    productId: wpProd.id,
    name: 'Starter WP',
    code: 'wp-starter',
    infrastructureMode: 'SHARED',
  });

  const wpVersion = catalog.publishPlanVersion({
    planId: wpPlan.id,
    version: 1,
    quotas: {
      cpuMilli: 500,
      memoryMb: 512,
      diskMb: 10240,
      bandwidthMb: 50000,
      maxApps: 1,
      maxDomains: 1,
      maxDatabases: 1,
      hermesAccess: false,
    },
    prices: [
      { currency: 'COP', billingCycle: BillingCycle.MONTHLY, priceCents: 3500000 },
      { currency: 'COP', billingCycle: BillingCycle.ANNUAL, priceCents: 35000000 },
    ],
    effectiveFrom: new Date('2026-01-01'),
  });

  const orderService = new OrderService(catalog);
  const wompiAdapter = new WompiPaymentAdapter({
    publicKey: 'pub_test_key',
    privateKey: 'prv_test_key',
    integritySecret: 'test_integrity_sec',
    eventsSecret: 'test_events_sec',
    isSandbox: true,
  });

  it('creates an order with server-calculated price and generates a payment session', async () => {
    const controller = new CheckoutController(
      orderService,
      wompiAdapter
    );

    const dto: CreateOrderDto = {
      organizationId: 'org-client-100',
      currency: 'COP',
      billingCycle: BillingCycle.MONTHLY,
      items: [
        {
          planVersionId: wpVersion.id,
          quantity: 1,
        },
      ],
      idempotencyKey: 'idem-api-test-01',
      customerEmail: 'cliente@velupi.com',
      redirectUrl: 'https://app.velupi.com/billing/success',
    };

    const response = await controller.createOrderAndSession(dto);

    expect(response.order.id).toBeDefined();
    expect(response.order.status).toBe(OrderStatus.PENDING_PAYMENT);
    expect(response.order.subtotalCents).toBe(3500000);
    expect(response.order.taxCents).toBe(665000); // 19% VAT
    expect(response.order.totalCents).toBe(4165000);
    expect(response.session.checkoutUrl).toBeDefined();
    expect(response.session.checkoutUrl).toContain('checkout.wompi.co');
  });

  it('safely recovers and resolves planVersionId when an older or stale planVersionId from previous container is passed', async () => {
    const controller = new CheckoutController(
      orderService,
      wompiAdapter,
      catalog
    );

    const dto: CreateOrderDto = {
      organizationId: 'org-client-100',
      currency: 'COP',
      billingCycle: BillingCycle.ANNUAL,
      items: [
        {
          planVersionId: 'pv-old-container-stale-id',
          quantity: 1,
        },
      ],
      idempotencyKey: 'idem-stale-version-test-02',
      customerEmail: 'edwin@velupi.com',
      redirectUrl: 'https://app.velupi.com/billing/success',
      primaryDomain: 'miempresa.com',
    };

    const response = await controller.createOrderAndSession(dto);

    expect(response.order).toBeDefined();
    expect(response.order.items[0].planVersionId).toBe(wpVersion.id);
    expect((response.order as any).primaryDomain).toBe('miempresa.com');
    expect(response.session.checkoutUrl).toContain('checkout.wompi.co');
  });
});


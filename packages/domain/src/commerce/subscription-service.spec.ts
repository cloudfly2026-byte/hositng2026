import { describe, it, expect, beforeEach } from 'vitest';
import {
  SubscriptionService,
  SubscriptionNotFoundError,
  InvoiceNotFoundError,
} from './subscription-service';
import { BillingCycle, ProductCatalogService, ProductCategory } from './catalog';
import { Order, OrderService, OrderStatus } from './onboarding-order';

describe('SubscriptionService & Invoicing (Commerce Engine)', () => {
  let catalog: ProductCatalogService;
  let orderService: OrderService;
  let subscriptionService: SubscriptionService;
  let planVersionId: string;

  beforeEach(() => {
    catalog = new ProductCatalogService();
    const prod = catalog.createProduct({
      name: 'Velupi Web Cloud',
      code: 'velupi-cloud',
      category: ProductCategory.WEB_HOSTING,
    });
    const plan = catalog.createPlan({
      productId: prod.id,
      name: 'Cloud Pro',
      code: 'cloud-pro',
      infrastructureMode: 'SHARED',
    });
    const pv = catalog.publishPlanVersion({
      planId: plan.id,
      version: 1,
      quotas: {
        cpuMilli: 1000,
        memoryMb: 2048,
        diskMb: 20480,
        bandwidthMb: 100000,
        maxApps: 5,
        maxDomains: 5,
        maxDatabases: 5,
        hermesAccess: true,
      },
      prices: [
        { currency: 'COP', billingCycle: BillingCycle.MONTHLY, priceCents: 5000000 },
        { currency: 'COP', billingCycle: BillingCycle.ANNUAL, priceCents: 50000000 },
      ],
      effectiveFrom: new Date('2026-01-01'),
    });
    planVersionId = pv.id;

    orderService = new OrderService(catalog);
    subscriptionService = new SubscriptionService();
  });

  describe('createSubscriptionFromPaidOrder', () => {
    it('creates an ACTIVE subscription and sets correct currentPeriodEnd for MONTHLY cycle', () => {
      const order = orderService.createOrder({
        organizationId: 'org-tenant-01',
        currency: 'COP',
        billingCycle: BillingCycle.MONTHLY,
        items: [{ planVersionId, quantity: 1 }],
        idempotencyKey: 'idem-sub-01',
      });
      order.status = OrderStatus.PAID;

      const sub = subscriptionService.createSubscriptionFromPaidOrder(order);

      expect(sub.id).toBeDefined();
      expect(sub.organizationId).toBe('org-tenant-01');
      expect(sub.status).toBe('ACTIVE');
      expect(sub.billingCycle).toBe(BillingCycle.MONTHLY);
      expect(sub.planVersionId).toBe(planVersionId);
      expect(sub.currentPeriodStart).toBeInstanceOf(Date);
      expect(sub.currentPeriodEnd).toBeInstanceOf(Date);

      // Period end should be ~30 days in future
      const diffDays = Math.round(
        (sub.currentPeriodEnd.getTime() - sub.currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(diffDays).toBe(30);
    });

    it('creates an ACTIVE subscription and sets 365 days for ANNUAL cycle', () => {
      const order = orderService.createOrder({
        organizationId: 'org-tenant-01',
        currency: 'COP',
        billingCycle: BillingCycle.ANNUAL,
        items: [{ planVersionId, quantity: 1 }],
        idempotencyKey: 'idem-sub-02',
      });
      order.status = OrderStatus.PAID;

      const sub = subscriptionService.createSubscriptionFromPaidOrder(order);

      const diffDays = Math.round(
        (sub.currentPeriodEnd.getTime() - sub.currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(diffDays).toBe(365);
    });

    it('rejects creating a subscription from an unpaid order', () => {
      const order = orderService.createOrder({
        organizationId: 'org-tenant-01',
        currency: 'COP',
        billingCycle: BillingCycle.MONTHLY,
        items: [{ planVersionId, quantity: 1 }],
        idempotencyKey: 'idem-sub-unpaid',
      });

      expect(() => subscriptionService.createSubscriptionFromPaidOrder(order)).toThrow(
        /Cannot create subscription from unpaid order/
      );
    });
  });

  describe('generateInvoiceForOrder', () => {
    it('generates a PAID invoice with sequential number and tax calculation for a paid order', () => {
      const order = orderService.createOrder({
        organizationId: 'org-tenant-01',
        currency: 'COP',
        billingCycle: BillingCycle.MONTHLY,
        items: [{ planVersionId, quantity: 1 }],
        idempotencyKey: 'idem-inv-01',
      });
      order.status = OrderStatus.PAID;

      const invoice = subscriptionService.generateInvoiceForOrder(order);

      expect(invoice.id).toBeDefined();
      expect(invoice.invoiceNumber).toMatch(/^INV-2026-\d{5}$/);
      expect(invoice.organizationId).toBe('org-tenant-01');
      expect(invoice.orderId).toBe(order.id);
      expect(invoice.status).toBe('PAID');
      expect(invoice.subtotalCents).toBe(order.subtotalCents);
      expect(invoice.taxCents).toBe(order.taxCents);
      expect(invoice.totalCents).toBe(order.totalCents);
      expect(invoice.items.length).toBe(1);
      expect(invoice.paidAt).toBeInstanceOf(Date);
    });

    it('generates a PENDING invoice for an order pending payment', () => {
      const order = orderService.createOrder({
        organizationId: 'org-tenant-01',
        currency: 'COP',
        billingCycle: BillingCycle.MONTHLY,
        items: [{ planVersionId, quantity: 1 }],
        idempotencyKey: 'idem-inv-02',
      });

      const invoice = subscriptionService.generateInvoiceForOrder(order);

      expect(invoice.status).toBe('PENDING');
      expect(invoice.paidAt).toBeUndefined();
    });
  });

  describe('Subscription Lifecycle & Invariants (Section 6.5 of AGENTS.md)', () => {
    it('transitions from ACTIVE to GRACE_PERIOD (5 days) when renewal period expires', () => {
      const order = orderService.createOrder({
        organizationId: 'org-tenant-01',
        currency: 'COP',
        billingCycle: BillingCycle.MONTHLY,
        items: [{ planVersionId, quantity: 1 }],
        idempotencyKey: 'idem-sub-grace',
      });
      order.status = OrderStatus.PAID;

      const sub = subscriptionService.createSubscriptionFromPaidOrder(order);

      // Simulate date 1 day after currentPeriodEnd
      const afterPeriodEnd = new Date(sub.currentPeriodEnd.getTime() + 1000 * 60 * 60 * 24);
      const evaluated = subscriptionService.evaluateSubscriptionStatus(sub.id, afterPeriodEnd);

      expect(evaluated.status).toBe('GRACE_PERIOD');
      expect(evaluated.gracePeriodUntil).toBeDefined();

      const graceDays = Math.round(
        (evaluated.gracePeriodUntil!.getTime() - sub.currentPeriodEnd.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(graceDays).toBe(5);
    });

    it('transitions from GRACE_PERIOD to SUSPENDED when grace period ends without payment', () => {
      const order = orderService.createOrder({
        organizationId: 'org-tenant-01',
        currency: 'COP',
        billingCycle: BillingCycle.MONTHLY,
        items: [{ planVersionId, quantity: 1 }],
        idempotencyKey: 'idem-sub-suspend',
      });
      order.status = OrderStatus.PAID;

      const sub = subscriptionService.createSubscriptionFromPaidOrder(order);

      // Simulate date 6 days after currentPeriodEnd (past 5-day grace period)
      const afterGrace = new Date(sub.currentPeriodEnd.getTime() + 1000 * 60 * 60 * 24 * 6);
      const evaluated = subscriptionService.evaluateSubscriptionStatus(sub.id, afterGrace);

      expect(evaluated.status).toBe('SUSPENDED');
      expect(evaluated.suspendedAt).toBeDefined();
    });

    it('reactivates a SUSPENDED subscription upon payment of renewal order', () => {
      const order = orderService.createOrder({
        organizationId: 'org-tenant-01',
        currency: 'COP',
        billingCycle: BillingCycle.MONTHLY,
        items: [{ planVersionId, quantity: 1 }],
        idempotencyKey: 'idem-sub-orig',
      });
      order.status = OrderStatus.PAID;

      const sub = subscriptionService.createSubscriptionFromPaidOrder(order);
      const pastGrace = new Date(sub.currentPeriodEnd.getTime() + 1000 * 60 * 60 * 24 * 7);
      subscriptionService.evaluateSubscriptionStatus(sub.id, pastGrace);

      // Create renewal order
      const renewalOrder = orderService.createOrder({
        organizationId: 'org-tenant-01',
        currency: 'COP',
        billingCycle: BillingCycle.MONTHLY,
        items: [{ planVersionId, quantity: 1 }],
        idempotencyKey: 'idem-sub-renew',
      });
      renewalOrder.status = OrderStatus.PAID;

      const reactivated = subscriptionService.reactivateSubscription(sub.id, renewalOrder);

      expect(reactivated.status).toBe('ACTIVE');
      expect(reactivated.suspendedAt).toBeNull();
      expect(reactivated.gracePeriodUntil).toBeNull();
      expect(reactivated.currentPeriodEnd.getTime()).toBeGreaterThan(Date.now());
    });

    it('cancels a subscription upon customer request', () => {
      const order = orderService.createOrder({
        organizationId: 'org-tenant-01',
        currency: 'COP',
        billingCycle: BillingCycle.MONTHLY,
        items: [{ planVersionId, quantity: 1 }],
        idempotencyKey: 'idem-sub-cancel',
      });
      order.status = OrderStatus.PAID;

      const sub = subscriptionService.createSubscriptionFromPaidOrder(order);
      const cancelled = subscriptionService.cancelSubscription(sub.id);

      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.cancelledAt).toBeInstanceOf(Date);
    });
  });

  describe('Organization Queries', () => {
    it('retrieves subscriptions and invoices filtered by tenant organization', () => {
      const order1 = orderService.createOrder({
        organizationId: 'org-alpha',
        currency: 'COP',
        billingCycle: BillingCycle.MONTHLY,
        items: [{ planVersionId, quantity: 1 }],
        idempotencyKey: 'idem-alpha',
      });
      order1.status = OrderStatus.PAID;

      const order2 = orderService.createOrder({
        organizationId: 'org-beta',
        currency: 'COP',
        billingCycle: BillingCycle.MONTHLY,
        items: [{ planVersionId, quantity: 1 }],
        idempotencyKey: 'idem-beta',
      });
      order2.status = OrderStatus.PAID;

      subscriptionService.createSubscriptionFromPaidOrder(order1);
      subscriptionService.createSubscriptionFromPaidOrder(order2);

      subscriptionService.generateInvoiceForOrder(order1);
      subscriptionService.generateInvoiceForOrder(order2);

      const alphaSubs = subscriptionService.getSubscriptionsByOrganization('org-alpha');
      const betaSubs = subscriptionService.getSubscriptionsByOrganization('org-beta');

      expect(alphaSubs.length).toBe(1);
      expect(alphaSubs[0].organizationId).toBe('org-alpha');
      expect(betaSubs.length).toBe(1);
      expect(betaSubs[0].organizationId).toBe('org-beta');

      const alphaInvs = subscriptionService.getInvoicesByOrganization('org-alpha');
      expect(alphaInvs.length).toBe(1);
      expect(alphaInvs[0].organizationId).toBe('org-alpha');
    });

    it('throws when getting non-existent subscription or invoice', () => {
      expect(() => subscriptionService.getSubscriptionById('non-existent')).toThrow(
        SubscriptionNotFoundError
      );
      expect(() => subscriptionService.getInvoiceById('non-existent')).toThrow(
        InvoiceNotFoundError
      );
    });
  });
});

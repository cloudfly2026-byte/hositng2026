import { describe, it, expect } from 'vitest';
import {
  OnboardingService,
  RegisterCustomerInput,
  DuplicateEmailError,
  InvalidVerificationTokenError,
  OrderService,
  CreateOrderInput,
  PriceTamperingViolationError,
  OrderStatus,
} from './onboarding-order';
import { ProductCatalogService, ProductCategory, BillingCycle } from './catalog';

describe('Epic COM-02 & COM-03 - Customer Onboarding and Orders', () => {
  // Setup Catalog
  const catalog = new ProductCatalogService();
  const product = catalog.createProduct({
    name: 'Velupi WordPress',
    code: 'velupi-wp',
    category: ProductCategory.WORDPRESS,
  });

  const plan = catalog.createPlan({
    productId: product.id,
    name: 'WP Shared Starter',
    code: 'wp-starter',
    infrastructureMode: 'SHARED',
  });

  const planVersion = catalog.publishPlanVersion({
    planId: plan.id,
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
      { currency: 'COP', billingCycle: BillingCycle.MONTHLY, priceCents: 3000000 }, // 30,000 COP
      { currency: 'COP', billingCycle: BillingCycle.ANNUAL, priceCents: 30000000 },  // 300,000 COP
    ],
    effectiveFrom: new Date('2026-01-01'),
  });

  describe('COM-02: Customer Onboarding', () => {
    it('registers a customer account and organization without provisioning infrastructure', () => {
      const onboarding = new OnboardingService();
      const input: RegisterCustomerInput = {
        email: 'founder@mycompany.co',
        fullName: 'Carlos Gómez',
        organizationName: 'Gómez Tech SAS',
      };

      const result = onboarding.register(input);

      expect(result.user.id).toBeDefined();
      expect(result.user.email).toBe('founder@mycompany.co');
      expect(result.user.emailVerified).toBe(false);
      expect(result.organization.id).toBeDefined();
      expect(result.organization.name).toBe('Gómez Tech SAS');
      expect(result.verificationToken).toBeDefined();
      expect(result.activeEntitlementsCount).toBe(0); // Invariant: no premature infrastructure
    });

    it('rejects registration with duplicate email address', () => {
      const onboarding = new OnboardingService();
      onboarding.register({
        email: 'duplicate@test.com',
        fullName: 'Test One',
        organizationName: 'Org One',
      });

      expect(() => {
        onboarding.register({
          email: 'duplicate@test.com',
          fullName: 'Test Two',
          organizationName: 'Org Two',
        });
      }).toThrow(DuplicateEmailError);
    });

    it('verifies customer email with valid token and rejects invalid tokens', () => {
      const onboarding = new OnboardingService();
      const reg = onboarding.register({
        email: 'verify@test.com',
        fullName: 'Verifiable User',
        organizationName: 'Verify Org',
      });

      expect(() => {
        onboarding.verifyEmail(reg.user.id, 'wrong-token-xyz');
      }).toThrow(InvalidVerificationTokenError);

      const verifiedUser = onboarding.verifyEmail(reg.user.id, reg.verificationToken);
      expect(verifiedUser.emailVerified).toBe(true);
    });
  });

  describe('COM-03: Order Management & Cart Checkout', () => {
    it('creates an order with server-calculated totals and 19% VAT for Colombia', () => {
      const orderService = new OrderService(catalog);
      const input: CreateOrderInput = {
        organizationId: 'org-123',
        currency: 'COP',
        billingCycle: BillingCycle.MONTHLY,
        items: [
          {
            planVersionId: planVersion.id,
            quantity: 1,
          },
        ],
        idempotencyKey: 'idem-order-001',
      };

      const order = orderService.createOrder(input);

      expect(order.id).toBeDefined();
      expect(order.status).toBe(OrderStatus.PENDING_PAYMENT);
      expect(order.currency).toBe('COP');
      expect(order.subtotalCents).toBe(3000000); // 30,000 COP
      expect(order.taxCents).toBe(570000); // 19% VAT = 5,700 COP
      expect(order.totalCents).toBe(3570000); // 35,700 COP
      expect(order.items[0].planVersionId).toBe(planVersion.id);
    });

    it('rejects order if client attempts to tamper with prices', () => {
      const orderService = new OrderService(catalog);
      const tamperedInput: CreateOrderInput = {
        organizationId: 'org-123',
        currency: 'COP',
        billingCycle: BillingCycle.MONTHLY,
        items: [
          {
            planVersionId: planVersion.id,
            quantity: 1,
            claimedUnitPriceCents: 100, // Attempted to pay 1 peso instead of 30,000!
          },
        ],
        idempotencyKey: 'idem-order-tamper',
      };

      expect(() => {
        orderService.createOrder(tamperedInput);
      }).toThrow(PriceTamperingViolationError);
    });

    it('guarantees idempotency: submitting the same idempotency key returns the existing order', () => {
      const orderService = new OrderService(catalog);
      const input: CreateOrderInput = {
        organizationId: 'org-123',
        currency: 'COP',
        billingCycle: BillingCycle.ANNUAL,
        items: [
          {
            planVersionId: planVersion.id,
            quantity: 1,
          },
        ],
        idempotencyKey: 'idem-order-duplicate-check',
      };

      const order1 = orderService.createOrder(input);
      const order2 = orderService.createOrder(input);

      expect(order1.id).toBe(order2.id);
      expect(order1.orderNumber).toBe(order2.orderNumber);
      expect(orderService.getOrderCount()).toBe(1);
    });

    it('persists created and updated orders to IUnitOfWork when provided', async () => {
      const savedOrders: Order[] = [];
      const mockUow: any = {
        orders: {
          save: async (order: Order) => {
            savedOrders.push({ ...order });
          },
          findById: async (id: string) => savedOrders.find((o) => o.id === id) || null,
          findByIdempotencyKey: async (key: string) =>
            savedOrders.find((o) => o.idempotencyKey === key) || null,
          listByOrganization: async (orgId: string) =>
            savedOrders.filter((o) => o.organizationId === orgId),
        },
      };

      const orderService = new OrderService(catalog, mockUow);
      const input: CreateOrderInput = {
        organizationId: 'org-123',
        currency: 'COP',
        billingCycle: BillingCycle.ANNUAL,
        items: [
          {
            planVersionId: planVersion.id,
            quantity: 1,
          },
        ],
        idempotencyKey: 'idem-uow-order',
      };

      const order = orderService.createOrder(input);
      expect(savedOrders).toHaveLength(1);
      expect(savedOrders[0].id).toBe(order.id);

      orderService.updateOrderStatus(order.id, OrderStatus.PAID);
      expect(savedOrders).toHaveLength(2);
      expect(savedOrders[1].status).toBe(OrderStatus.PAID);
    });
  });
});


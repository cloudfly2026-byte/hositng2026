import { describe, it, expect, beforeEach } from 'vitest';
import {
  CartService,
  CreateCartInput,
  CartStatus,
  CartDraft,
} from './cart';
import {
  ProductCatalogService,
  ProductCategory,
  BillingCycle,
} from './catalog';

describe('CartService (Commerce Engine)', () => {
  let catalog: ProductCatalogService;
  let cartService: CartService;
  let wpPlanId: string;
  let wpPlanVersionId: string;

  beforeEach(() => {
    catalog = new ProductCatalogService();
    const product = catalog.createProduct({
      name: 'Velupi WordPress Hosting',
      code: 'velupi-wp',
      category: ProductCategory.WORDPRESS,
    });

    const plan = catalog.createPlan({
      productId: product.id,
      name: 'WordPress Starter',
      code: 'wp-starter',
      infrastructureMode: 'SHARED',
    });
    wpPlanId = plan.id;

    const version = catalog.publishPlanVersion({
      planId: plan.id,
      version: 1,
      quotas: {
        cpuMilli: 1000,
        memoryMb: 2048,
        diskMb: 10240,
        bandwidthMb: 50000,
        maxApps: 1,
        maxDomains: 1,
        maxDatabases: 1,
        hermesAccess: false,
      },
      prices: [
        { currency: 'COP', billingCycle: BillingCycle.MONTHLY, priceCents: 3500000 }, // 35,000 COP
        { currency: 'COP', billingCycle: BillingCycle.ANNUAL, priceCents: 35000000 },  // 350,000 COP (2 months free equiv)
      ],
      effectiveFrom: new Date('2026-01-01'),
    });
    wpPlanVersionId = version.id;

    cartService = new CartService(catalog);
  });

  it('creates a durable cart draft with opaque UUID and server-calculated price (zero trust in client price)', async () => {
    const input: CreateCartInput = {
      planCode: 'wp-starter',
      billingCycle: BillingCycle.ANNUAL,
      currency: 'COP',
    };

    const cart = await cartService.createCart(input);

    expect(cart.id).toBeDefined();
    expect(cart.status).toBe(CartStatus.ACTIVE);
    expect(cart.currency).toBe('COP');
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].planCode).toBe('wp-starter');
    expect(cart.items[0].planVersionId).toBe(wpPlanVersionId);
    expect(cart.items[0].billingCycle).toBe(BillingCycle.ANNUAL);

    // Server-calculated price: 350,000 COP
    expect(cart.items[0].unitPriceCents).toBe(35000000);
    expect(cart.subtotalCents).toBe(35000000);
    expect(cart.taxCents).toBe(Math.round(35000000 * 0.19)); // 66,500 COP
    expect(cart.totalCents).toBe(35000000 + Math.round(35000000 * 0.19)); // 416,500 COP
    expect(cart.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('updates billing cycle and recalculates subtotal, taxes and totals automatically', async () => {
    const cart = await cartService.createCart({
      planCode: 'wp-starter',
      billingCycle: BillingCycle.ANNUAL,
      currency: 'COP',
    });

    // Customer switches to MONTHLY
    const updated = await cartService.updateCart(cart.id, {
      billingCycle: BillingCycle.MONTHLY,
    });

    expect(updated.items[0].billingCycle).toBe(BillingCycle.MONTHLY);
    expect(updated.items[0].unitPriceCents).toBe(3500000); // 35,000 COP
    expect(updated.subtotalCents).toBe(3500000);
    expect(updated.taxCents).toBe(Math.round(3500000 * 0.19)); // 6,650 COP
    expect(updated.totalCents).toBe(3500000 + Math.round(3500000 * 0.19)); // 41,650 COP
  });

  it('claims an anonymous cart linking it to authenticated user and organization', async () => {
    const cart = await cartService.createCart({
      planCode: 'wp-starter',
      billingCycle: BillingCycle.ANNUAL,
      currency: 'COP',
    });

    expect(cart.userId).toBeUndefined();
    expect(cart.organizationId).toBeUndefined();

    const claimed = await cartService.claimCart(cart.id, 'user-123', 'org-456');

    expect(claimed.status).toBe(CartStatus.CLAIMED);
    expect(claimed.userId).toBe('user-123');
    expect(claimed.organizationId).toBe('org-456');
  });

  it('rejects cart creation for unknown plan code', async () => {
    await expect(
      cartService.createCart({
        planCode: 'non-existent-plan',
        billingCycle: BillingCycle.MONTHLY,
        currency: 'COP',
      })
    ).rejects.toThrow("Plan 'non-existent-plan' not found.");
  });

  it('detects and marks expired carts', async () => {
    const cart = await cartService.createCart({
      planCode: 'wp-starter',
      billingCycle: BillingCycle.MONTHLY,
      currency: 'COP',
    });

    // Simulate expiration
    cart.expiresAt = new Date(Date.now() - 1000);

    await expect(cartService.getCart(cart.id)).rejects.toThrow('Cart has expired.');
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { CartController, CreateCartDto, UpdateCartDto } from './cart.controller';
import {
  CartService,
  ProductCatalogService,
  BillingCycle,
} from '@cloudfly/domain';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CartController (Shopping Cart API)', () => {
  let controller: CartController;
  let cartService: CartService;
  let catalogService: ProductCatalogService;

  beforeEach(() => {
    catalogService = new ProductCatalogService();
    catalogService.initializeStandardCatalog();
    cartService = new CartService(catalogService);
    controller = new CartController(cartService);
  });

  it('POST /cart creates a new cart draft with server-side pricing and tax calculation', async () => {
    const dto: CreateCartDto = {
      planCode: 'wp-starter',
      billingCycle: BillingCycle.ANNUAL,
      currency: 'COP',
    };

    const cart = await controller.createCart(dto);

    expect(cart.id).toBeDefined();
    expect(cart.items[0].planCode).toBe('wp-starter');
    expect(cart.items[0].billingCycle).toBe(BillingCycle.ANNUAL);
    expect(cart.subtotalCents).toBe(35000000); // 350,000 COP
    expect(cart.taxCents).toBe(Math.round(35000000 * 0.19));
    expect(cart.totalCents).toBe(35000000 + Math.round(35000000 * 0.19));
  });

  it('GET /cart/:id returns existing cart', async () => {
    const created = await controller.createCart({
      planCode: 'wp-starter',
      billingCycle: BillingCycle.MONTHLY,
      currency: 'COP',
    });

    const fetched = await controller.getCart(created.id);
    expect(fetched.id).toBe(created.id);
    expect(fetched.subtotalCents).toBe(3500000);
  });

  it('GET /cart/:id throws NotFoundException for invalid cart ID', async () => {
    await expect(controller.getCart('non-existent-cart-id')).rejects.toThrow(NotFoundException);
  });

  it('PATCH /cart/:id updates billingCycle and recalculates totals server-side', async () => {
    const created = await controller.createCart({
      planCode: 'wp-starter',
      billingCycle: BillingCycle.MONTHLY,
      currency: 'COP',
    });

    const updateDto: UpdateCartDto = {
      billingCycle: BillingCycle.ANNUAL,
    };

    const updated = await controller.updateCart(created.id, updateDto);
    expect(updated.items[0].billingCycle).toBe(BillingCycle.ANNUAL);
    expect(updated.subtotalCents).toBe(35000000);
  });

  it('POST /cart/:id/claim associates cart with user and organization', async () => {
    const created = await controller.createCart({
      planCode: 'cloud-apps-pro',
      billingCycle: BillingCycle.MONTHLY,
      currency: 'COP',
    });

    const claimed = await controller.claimCart(
      created.id,
      { user: { userId: 'usr-999', organizationId: 'org-999' } } as any
    );

    expect(claimed.status).toBe('CLAIMED');
    expect(claimed.userId).toBe('usr-999');
    expect(claimed.organizationId).toBe('org-999');
  });
});

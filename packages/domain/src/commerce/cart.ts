import { randomUUID, createHash } from 'node:crypto';
import {
  ProductCatalogService,
  BillingCycle,
} from './catalog';

export enum CartStatus {
  ACTIVE = 'ACTIVE',
  CLAIMED = 'CLAIMED',
  CHECKED_OUT = 'CHECKED_OUT',
  EXPIRED = 'EXPIRED',
}

export interface CartItem {
  id: string;
  planId: string;
  planCode: string;
  planName: string;
  planVersionId: string;
  billingCycle: BillingCycle;
  unitPriceCents: number;
  quantity: number;
  extras?: Record<string, any>;
}

export interface CartDraft {
  id: string;
  anonymousTokenHash: string;
  userId?: string;
  organizationId?: string;
  currency: string;
  items: CartItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  expiresAt: Date;
  status: CartStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCartInput {
  planCode: string;
  billingCycle: BillingCycle;
  currency: string;
  userId?: string;
  organizationId?: string;
  extras?: Record<string, any>;
}

export interface UpdateCartInput {
  billingCycle?: BillingCycle;
  quantity?: number;
  extras?: Record<string, any>;
}

export class CartService {
  private carts: Map<string, CartDraft> = new Map();
  private readonly ttlMs: number;
  private readonly taxRate: number;

  constructor(
    private readonly catalog: ProductCatalogService,
    options?: { ttlMs?: number; taxRate?: number }
  ) {
    this.ttlMs = options?.ttlMs ?? 7 * 24 * 60 * 60 * 1000; // 7 days default
    this.taxRate = options?.taxRate ?? 0.19; // 19% IVA Colombia
  }

  async createCart(input: CreateCartInput): Promise<CartDraft> {
    const plan = this.findPlanByCode(input.planCode);
    if (!plan) {
      throw new Error(`Plan '${input.planCode}' not found.`);
    }

    const version = this.catalog.getActiveVersionForDate(plan.id, new Date());
    const price = this.catalog.getPrice(version.id, input.currency, input.billingCycle);

    const now = new Date();
    const cartId = randomUUID();
    const anonymousToken = randomUUID();
    const anonymousTokenHash = createHash('sha256').update(anonymousToken).digest('hex');

    const quantity = 1;
    const subtotalCents = price.priceCents * quantity;
    const taxCents = Math.round(subtotalCents * this.taxRate);
    const totalCents = subtotalCents + taxCents;

    const item: CartItem = {
      id: `ci-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      planId: plan.id,
      planCode: plan.code,
      planName: plan.name,
      planVersionId: version.id,
      billingCycle: input.billingCycle,
      unitPriceCents: price.priceCents,
      quantity,
      extras: input.extras,
    };

    const cart: CartDraft = {
      id: cartId,
      anonymousTokenHash,
      userId: input.userId,
      organizationId: input.organizationId,
      currency: input.currency,
      items: [item],
      subtotalCents,
      taxCents,
      totalCents,
      expiresAt: new Date(now.getTime() + this.ttlMs),
      status: CartStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    };

    this.carts.set(cartId, cart);
    return cart;
  }

  async getCart(cartId: string): Promise<CartDraft> {
    const cart = this.carts.get(cartId);
    if (!cart) {
      throw new Error(`Cart '${cartId}' not found.`);
    }

    if (cart.expiresAt.getTime() < Date.now()) {
      cart.status = CartStatus.EXPIRED;
      throw new Error('Cart has expired.');
    }

    return cart;
  }

  async updateCart(cartId: string, input: UpdateCartInput): Promise<CartDraft> {
    const cart = await this.getCart(cartId);

    if (cart.items.length === 0) {
      throw new Error('Cart contains no items to update.');
    }

    const primaryItem = cart.items[0];

    if (input.billingCycle && input.billingCycle !== primaryItem.billingCycle) {
      const price = this.catalog.getPrice(
        primaryItem.planVersionId,
        cart.currency,
        input.billingCycle
      );
      primaryItem.billingCycle = input.billingCycle;
      primaryItem.unitPriceCents = price.priceCents;
    }

    if (input.quantity !== undefined && input.quantity > 0) {
      primaryItem.quantity = input.quantity;
    }

    if (input.extras !== undefined) {
      primaryItem.extras = { ...primaryItem.extras, ...input.extras };
    }

    // Recalculate totals
    let subtotalCents = 0;
    for (const item of cart.items) {
      subtotalCents += item.unitPriceCents * item.quantity;
    }

    cart.subtotalCents = subtotalCents;
    cart.taxCents = Math.round(subtotalCents * this.taxRate);
    cart.totalCents = subtotalCents + cart.taxCents;
    cart.updatedAt = new Date();

    return cart;
  }

  async claimCart(cartId: string, userId: string, organizationId: string): Promise<CartDraft> {
    const cart = await this.getCart(cartId);

    cart.userId = userId;
    cart.organizationId = organizationId;
    cart.status = CartStatus.CLAIMED;
    cart.updatedAt = new Date();

    return cart;
  }

  private findPlanByCode(planCode: string) {
    // Access plans from catalog
    const anyCatalog = this.catalog as any;
    if (anyCatalog.plans && anyCatalog.plans instanceof Map) {
      for (const p of anyCatalog.plans.values()) {
        if (p.code === planCode) {
          return p;
        }
      }
    }
    return undefined;
  }
}

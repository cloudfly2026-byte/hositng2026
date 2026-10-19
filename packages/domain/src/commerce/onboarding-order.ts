import { BillingCycle, ProductCatalogService } from './catalog';
import { IUnitOfWork } from '../repositories/interfaces';

export interface CustomerUser {
  id: string;
  email: string;
  fullName: string;
  emailVerified: boolean;
  passwordHash?: string;
  createdAt: Date;
}

export interface CustomerOrganization {
  id: string;
  name: string;
  slug: string;
  ownerUserId: string;
  isInternalPilot?: boolean;
  createdAt: Date;
}

export interface RegisterCustomerInput {
  email: string;
  fullName: string;
  organizationName: string;
}

export interface RegistrationResult {
  user: CustomerUser;
  organization: CustomerOrganization;
  verificationToken: string;
  activeEntitlementsCount: number;
}

export class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`User with email '${email}' already exists.`);
    this.name = 'DuplicateEmailError';
  }
}

export class InvalidVerificationTokenError extends Error {
  constructor() {
    super('The email verification token is invalid or expired.');
    this.name = 'InvalidVerificationTokenError';
  }
}

export class OnboardingService {
  private users: Map<string, CustomerUser> = new Map();
  private organizations: Map<string, CustomerOrganization> = new Map();
  private verificationTokens: Map<string, string> = new Map(); // userId -> token

  register(input: RegisterCustomerInput): RegistrationResult {
    const existing = Array.from(this.users.values()).find(
      (u) => u.email.toLowerCase() === input.email.toLowerCase()
    );

    if (existing) {
      throw new DuplicateEmailError(input.email);
    }

    const userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const user: CustomerUser = {
      id: userId,
      email: input.email.toLowerCase(),
      fullName: input.fullName.trim(),
      emailVerified: false,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);

    const orgId = `org-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const slug = input.organizationName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const organization: CustomerOrganization = {
      id: orgId,
      name: input.organizationName.trim(),
      slug,
      ownerUserId: user.id,
      createdAt: new Date(),
    };
    this.organizations.set(organization.id, organization);

    const verificationToken = `vt-${Math.random().toString(36).substring(2, 15)}`;
    this.verificationTokens.set(user.id, verificationToken);

    return {
      user,
      organization,
      verificationToken,
      activeEntitlementsCount: 0, // Invariant: no automatic infrastructure upon registration
    };
  }

  verifyEmail(userId: string, token: string): CustomerUser {
    const expectedToken = this.verificationTokens.get(userId);
    if (!expectedToken || expectedToken !== token) {
      throw new InvalidVerificationTokenError();
    }

    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User '${userId}' not found.`);
    }

    user.emailVerified = true;
    this.verificationTokens.delete(userId);
    return user;
  }
}

export enum OrderStatus {
  DRAFT = 'DRAFT',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAID = 'PAID',
  PROVISIONING = 'PROVISIONING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export interface OrderItem {
  id: string;
  orderId: string;
  planVersionId: string;
  billingCycle: BillingCycle;
  unitPriceCents: number;
  quantity: number;
}

export interface Order {
  id: string;
  organizationId: string;
  orderNumber: string;
  status: OrderStatus;
  currency: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  items: OrderItem[];
  idempotencyKey: string;
  createdAt: Date;
}

export interface CreateOrderItemInput {
  planVersionId: string;
  quantity: number;
  claimedUnitPriceCents?: number;
}

export interface CreateOrderInput {
  organizationId: string;
  currency: string;
  billingCycle: BillingCycle;
  items: CreateOrderItemInput[];
  idempotencyKey: string;
}

export class PriceTamperingViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PriceTamperingViolationError';
  }
}

export class OrderService {
  private orders: Map<string, Order> = new Map();
  private idempotencyIndex: Map<string, Order> = new Map(); // key -> Order

  constructor(
    private catalog: ProductCatalogService,
    private uow?: IUnitOfWork
  ) {}

  createOrder(input: CreateOrderInput): Order {
    // Idempotency check
    if (this.idempotencyIndex.has(input.idempotencyKey)) {
      return this.idempotencyIndex.get(input.idempotencyKey)!;
    }

    let subtotalCents = 0;
    const orderId = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const items: OrderItem[] = [];

    for (const itemInput of input.items) {
      const serverPrice = this.catalog.getPrice(
        itemInput.planVersionId,
        input.currency,
        input.billingCycle
      );

      // Security check: client must never override price
      if (
        itemInput.claimedUnitPriceCents !== undefined &&
        itemInput.claimedUnitPriceCents !== serverPrice.priceCents
      ) {
        throw new PriceTamperingViolationError(
          `Claimed price ${itemInput.claimedUnitPriceCents} does not match authoritative catalog price ${serverPrice.priceCents}.`
        );
      }

      const itemTotal = serverPrice.priceCents * itemInput.quantity;
      subtotalCents += itemTotal;

      items.push({
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        orderId,
        planVersionId: itemInput.planVersionId,
        billingCycle: input.billingCycle,
        unitPriceCents: serverPrice.priceCents,
        quantity: itemInput.quantity,
      });
    }

    // 19% VAT for Colombia (COP) or standard tax logic
    const taxRate = input.currency === 'COP' ? 0.19 : 0.0;
    const taxCents = Math.round(subtotalCents * taxRate);
    const totalCents = subtotalCents + taxCents;

    const order: Order = {
      id: orderId,
      organizationId: input.organizationId,
      orderNumber: `VEL-${Date.now().toString().slice(-6)}`,
      status: OrderStatus.PENDING_PAYMENT,
      currency: input.currency,
      subtotalCents,
      taxCents,
      totalCents,
      items,
      idempotencyKey: input.idempotencyKey,
      createdAt: new Date(),
    };

    this.orders.set(order.id, order);
    this.idempotencyIndex.set(input.idempotencyKey, order);

    if (this.uow) {
      Promise.resolve(this.uow.orders.save(order)).catch((err) => {
        console.warn('OrderService: background order save failed:', err?.message);
      });
    }

    return order;
  }

  getOrderCount(): number {
    return this.orders.size;
  }

  getOrderById(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }

  getOrderByNumber(orderNumber: string): Order | undefined {
    return Array.from(this.orders.values()).find((o) => o.orderNumber === orderNumber);
  }

  getOrdersByOrganization(orgId: string): Order[] {
    return Array.from(this.orders.values()).filter((o) => o.organizationId === orgId);
  }

  updateOrderStatus(orderId: string, status: OrderStatus): Order {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order '${orderId}' not found.`);
    }
    order.status = status;

    if (this.uow) {
      this.uow.orders.save(order);
    }

    return order;
  }

  cancelOrder(orderId: string, requestingOrgId?: string, isOperator: boolean = false): Order {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order '${orderId}' not found.`);
    }

    if (requestingOrgId && !isOperator && order.organizationId !== requestingOrgId) {
      throw new Error(
        `Tenant '${requestingOrgId}' is not authorized to cancel order belonging to '${order.organizationId}'.`
      );
    }

    // Idempotent: already cancelled
    if (order.status === OrderStatus.CANCELLED) {
      return order;
    }

    // Safety constraint: Cannot cancel PAID, PROVISIONING or COMPLETED orders
    if (
      order.status === OrderStatus.PAID ||
      order.status === OrderStatus.PROVISIONING ||
      order.status === OrderStatus.COMPLETED
    ) {
      throw new Error(`Cannot cancel order with status ${order.status}. Only unpaid orders can be cancelled.`);
    }

    order.status = OrderStatus.CANCELLED;

    if (this.uow) {
      this.uow.orders.save(order);
    }

    return order;
  }
}


import { BillingCycle } from './catalog';
import { Order, OrderStatus } from './onboarding-order';
import { IUnitOfWork } from '../repositories/interfaces';

export type SubscriptionStatus =
  | 'ACTIVE'
  | 'TRIALING'
  | 'PAST_DUE'
  | 'GRACE_PERIOD'
  | 'SUSPENDED'
  | 'CANCELLED'
  | 'TERMINATED';

export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'VOID' | 'REFUNDED';

export interface Subscription {
  id: string;
  organizationId: string;
  planVersionId: string;
  orderId: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  gracePeriodUntil: Date | null;
  suspendedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  organizationId: string;
  orderId: string;
  subscriptionId?: string;
  status: InvoiceStatus;
  currency: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  items: InvoiceItem[];
  issuedAt: Date;
  dueDate: Date;
  paidAt?: Date;
}

export class SubscriptionNotFoundError extends Error {
  constructor(id: string) {
    super(`Subscription '${id}' was not found.`);
    this.name = 'SubscriptionNotFoundError';
  }
}

export class InvoiceNotFoundError extends Error {
  constructor(id: string) {
    super(`Invoice '${id}' was not found.`);
    this.name = 'InvoiceNotFoundError';
  }
}

export class SubscriptionService {
  private subscriptions: Map<string, Subscription> = new Map();
  private invoices: Map<string, Invoice> = new Map();
  private invoiceCounter = 1;

  constructor(private readonly uow?: IUnitOfWork) {}

  createSubscriptionFromPaidOrder(order: Order): Subscription {
    if (order.status !== OrderStatus.PAID) {
      throw new Error(`Cannot create subscription from unpaid order '${order.id}' in status '${order.status}'.`);
    }

    // Idempotency: return existing subscription if already created for this order
    const existingSub = Array.from(this.subscriptions.values()).find((s) => s.orderId === order.id);
    if (existingSub) {
      return existingSub;
    }

    const firstItem = order.items[0];
    if (!firstItem) {
      throw new Error(`Order '${order.id}' has no items.`);
    }

    const now = new Date();
    const periodEnd = this.calculatePeriodEnd(now, firstItem.billingCycle);

    const subscription: Subscription = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      organizationId: order.organizationId,
      planVersionId: firstItem.planVersionId,
      orderId: order.id,
      status: 'ACTIVE',
      billingCycle: firstItem.billingCycle,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      gracePeriodUntil: null,
      suspendedAt: null,
      cancelledAt: null,
      createdAt: now,
    };

    this.subscriptions.set(subscription.id, subscription);
    if (this.uow?.subscriptions) {
      this.uow.subscriptions.save(subscription);
    }
    return subscription;
  }

  generateInvoiceForOrder(order: Order, subscriptionId?: string): Invoice {
    // Idempotency: return existing invoice if already generated for this order
    const existingInv = Array.from(this.invoices.values()).find((inv) => inv.orderId === order.id);
    if (existingInv) {
      return existingInv;
    }

    const padded = this.invoiceCounter.toString().padStart(5, '0');
    this.invoiceCounter++;

    const invoiceNumber = `INV-2026-${padded}`;
    const now = new Date();
    const dueDate = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7); // 7 days due

    const isPaid = order.status === OrderStatus.PAID;

    const items: InvoiceItem[] = order.items.map((item, idx) => ({
      id: `inv-item-${idx + 1}`,
      description: `Plan Version ${item.planVersionId} (${item.billingCycle})`,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      totalCents: item.unitPriceCents * item.quantity,
    }));

    const invoice: Invoice = {
      id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      invoiceNumber,
      organizationId: order.organizationId,
      orderId: order.id,
      subscriptionId,
      status: isPaid ? 'PAID' : 'PENDING',
      currency: order.currency,
      subtotalCents: order.subtotalCents,
      taxCents: order.taxCents,
      totalCents: order.totalCents,
      items,
      issuedAt: now,
      dueDate,
      paidAt: isPaid ? now : undefined,
    };

    this.invoices.set(invoice.id, invoice);
    if (this.uow?.invoices) {
      this.uow.invoices.save(invoice);
    }
    return invoice;
  }

  evaluateSubscriptionStatus(subscriptionId: string, asOfDate: Date = new Date()): Subscription {
    const sub = this.subscriptions.get(subscriptionId);
    if (!sub) {
      throw new SubscriptionNotFoundError(subscriptionId);
    }

    if (sub.status === 'CANCELLED' || sub.status === 'TERMINATED') {
      return sub;
    }

    // Check if period expired
    if (asOfDate.getTime() > sub.currentPeriodEnd.getTime()) {
      // Calculate grace period end (5 days after currentPeriodEnd)
      if (!sub.gracePeriodUntil) {
        sub.gracePeriodUntil = new Date(
          sub.currentPeriodEnd.getTime() + 1000 * 60 * 60 * 24 * 5
        );
      }

      if (asOfDate.getTime() > sub.gracePeriodUntil.getTime()) {
        sub.status = 'SUSPENDED';
        if (!sub.suspendedAt) {
          sub.suspendedAt = asOfDate;
        }
      } else {
        sub.status = 'GRACE_PERIOD';
      }

      if (this.uow?.subscriptions) {
        this.uow.subscriptions.save(sub);
      }
    }

    return sub;
  }

  reactivateSubscription(subscriptionId: string, renewalOrder: Order): Subscription {
    const sub = this.subscriptions.get(subscriptionId);
    if (!sub) {
      throw new SubscriptionNotFoundError(subscriptionId);
    }

    if (renewalOrder.status !== OrderStatus.PAID) {
      throw new Error(`Cannot reactivate subscription with unpaid order '${renewalOrder.id}'.`);
    }

    const firstItem = renewalOrder.items[0];
    const cycle = firstItem ? firstItem.billingCycle : sub.billingCycle;

    const baseStart = new Date();
    sub.currentPeriodStart = baseStart;
    sub.currentPeriodEnd = this.calculatePeriodEnd(baseStart, cycle);
    sub.status = 'ACTIVE';
    sub.gracePeriodUntil = null;
    sub.suspendedAt = null;

    if (this.uow?.subscriptions) {
      this.uow.subscriptions.save(sub);
    }

    return sub;
  }

  cancelSubscription(subscriptionId: string): Subscription {
    const sub = this.subscriptions.get(subscriptionId);
    if (!sub) {
      throw new SubscriptionNotFoundError(subscriptionId);
    }

    sub.status = 'CANCELLED';
    sub.cancelledAt = new Date();

    if (this.uow?.subscriptions) {
      this.uow.subscriptions.save(sub);
    }

    return sub;
  }

  getSubscriptionById(id: string): Subscription {
    const sub = this.subscriptions.get(id);
    if (!sub) {
      throw new SubscriptionNotFoundError(id);
    }
    return sub;
  }

  getSubscriptionsByOrganization(organizationId: string): Subscription[] {
    return Array.from(this.subscriptions.values()).filter(
      (s) => s.organizationId === organizationId
    );
  }

  getInvoiceById(id: string): Invoice {
    const inv = this.invoices.get(id);
    if (!inv) {
      throw new InvoiceNotFoundError(id);
    }
    return inv;
  }

  getInvoicesByOrganization(organizationId: string): Invoice[] {
    return Array.from(this.invoices.values()).filter(
      (inv) => inv.organizationId === organizationId
    );
  }

  private calculatePeriodEnd(start: Date, cycle: BillingCycle): Date {
    const end = new Date(start.getTime());
    switch (cycle) {
      case BillingCycle.MONTHLY:
        end.setDate(end.getDate() + 30);
        break;
      case BillingCycle.QUARTERLY:
        end.setDate(end.getDate() + 90);
        break;
      case BillingCycle.SEMI_ANNUAL:
        end.setDate(end.getDate() + 180);
        break;
      case BillingCycle.ANNUAL:
        end.setDate(end.getDate() + 365);
        break;
      case BillingCycle.BIENNIAL:
        end.setDate(end.getDate() + 730);
        break;
      default:
        end.setDate(end.getDate() + 30);
    }
    return end;
  }
}

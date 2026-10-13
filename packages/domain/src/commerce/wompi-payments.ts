import { createHmac, createHash } from 'node:crypto';
import {
  PaymentProvider,
  PaymentSessionResult,
  PaymentSessionContext,
  WebhookPaymentEvent,
  PaymentStatus,
} from '@cloudfly/contracts';
import { Order, OrderStatus } from './onboarding-order';

export interface WompiConfig {
  publicKey: string;
  privateKey: string;
  integritySecret: string;
  eventsSecret: string;
  isSandbox: boolean;
}

export class InvalidWebhookSignatureError extends Error {
  constructor(message: string = 'Invalid webhook HMAC signature') {
    super(message);
    this.name = 'InvalidWebhookSignatureError';
  }
}

export class OrderNotEligibleForPaymentError extends Error {
  constructor(orderId: string, currentStatus: OrderStatus) {
    super(`Order '${orderId}' in status '${currentStatus}' cannot be updated by this payment event.`);
    this.name = 'OrderNotEligibleForPaymentError';
  }
}

export class WompiPaymentAdapter implements PaymentProvider {
  readonly name = 'WOMPI';

  constructor(private config: WompiConfig) {}

  generateTestSignature(payload: unknown, secret: string): string {
    const rawString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return createHmac('sha256', secret).update(rawString).digest('hex');
  }

  async createPaymentSession(
    order: { id: string; totalCents: number; currency: string; orderNumber: string },
    context: PaymentSessionContext
  ): Promise<PaymentSessionResult> {
    const integrityRaw = `${order.orderNumber}${order.totalCents}${order.currency}${this.config.integritySecret}`;
    const integritySignature = createHash('sha256').update(integrityRaw).digest('hex');

    const baseUrl = this.config.isSandbox
      ? 'https://checkout.wompi.co/p/'
      : 'https://checkout.wompi.co/p/';

    const queryParams = new URLSearchParams({
      'public-key': this.config.publicKey,
      currency: order.currency,
      'amount-in-cents': order.totalCents.toString(),
      reference: order.orderNumber,
      'signature:integrity': integritySignature,
      'redirect-url': context.redirectUrl,
      'customer-data:email': context.customerEmail,
    });

    const checkoutUrl = `${baseUrl}?${queryParams.toString()}`;

    return {
      sessionId: `wompi-sess-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      checkoutUrl,
      providerReference: order.orderNumber,
    };
  }

  verifyWebhookSignature(payload: unknown, headers: Record<string, string>): boolean {
    const signatureHeader = headers['x-event-checksum'] || headers['X-Event-Checksum'];
    if (!signatureHeader) {
      return false;
    }

    const expectedSignature = this.generateTestSignature(payload, this.config.eventsSecret);
    return signatureHeader === expectedSignature;
  }

  parseWebhookEvent(payload: unknown): WebhookPaymentEvent {
    const body = payload as {
      event: string;
      data: {
        transaction: {
          id: string;
          reference: string;
          status: string;
          amount_in_cents: number;
          currency: string;
        };
      };
    };

    const trx = body?.data?.transaction;
    if (!trx) {
      throw new Error('Malformed Wompi transaction webhook payload');
    }

    let status: PaymentStatus = 'PENDING';
    if (trx.status === 'APPROVED') {
      status = 'APPROVED';
    } else if (trx.status === 'DECLINED') {
      status = 'DECLINED';
    } else if (trx.status === 'VOIDED') {
      status = 'VOIDED';
    } else if (trx.status === 'ERROR') {
      status = 'ERROR';
    }

    return {
      providerReference: trx.id,
      orderId: trx.reference,
      status,
      amountCents: trx.amount_in_cents,
      currency: trx.currency,
      rawPayload: payload as Record<string, unknown>,
    };
  }
}

export class PaymentProcessorService {
  private processedEvents: Set<string> = new Set(); // idempotency for transaction IDs

  constructor(
    private paymentProvider: PaymentProvider,
    private orders: Map<string, Order>
  ) {}

  processWebhook(payload: unknown, headers: Record<string, string>): Order {
    const isValid = this.paymentProvider.verifyWebhookSignature(payload, headers);
    if (!isValid) {
      throw new InvalidWebhookSignatureError();
    }

    const event = this.paymentProvider.parseWebhookEvent(payload);
    const order = this.orders.get(event.orderId);

    if (!order) {
      throw new Error(`Order '${event.orderId}' not found.`);
    }

    // Idempotency: if this exact transaction was already processed for this order, return existing order
    const eventKey = `${event.providerReference}:${event.status}`;
    if (this.processedEvents.has(eventKey) && order.status === OrderStatus.PAID) {
      return order;
    }

    // Rule: Out of order pending events cannot revert a PAID order
    if (order.status === OrderStatus.PAID && event.status !== 'APPROVED') {
      throw new OrderNotEligibleForPaymentError(order.id, order.status);
    }

    if (event.status === 'APPROVED') {
      order.status = OrderStatus.PAID;
      this.processedEvents.add(eventKey);
    } else if (event.status === 'DECLINED' || event.status === 'ERROR') {
      order.status = OrderStatus.FAILED;
      this.processedEvents.add(eventKey);
    }

    return order;
  }
}

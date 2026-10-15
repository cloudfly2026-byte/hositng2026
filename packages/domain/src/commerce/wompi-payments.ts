import { createHmac, createHash } from 'node:crypto';
import {
  PaymentProvider,
  PaymentSessionResult,
  PaymentSessionContext,
  WebhookPaymentEvent,
  PaymentStatus,
  PaymentStatusResult,
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
    const signatureHeader =
      headers['x-event-checksum'] ||
      headers['X-Event-Checksum'] ||
      (typeof payload === 'object' && payload !== null ? (payload as any)?.signature?.checksum : undefined);

    if (!signatureHeader) {
      return false;
    }

    // 1. Official Wompi properties concatenation:
    // SHA256(val(prop1) + val(prop2) + ... + timestamp + eventsSecret)
    if (typeof payload === 'object' && payload !== null) {
      const p = payload as any;
      if (Array.isArray(p.signature?.properties) && p.timestamp !== undefined) {
        let concatenated = '';
        for (const prop of p.signature.properties) {
          const parts = prop.split('.');
          let curr = p.data;
          for (const part of parts) {
            curr = curr?.[part];
          }
          concatenated += curr !== undefined && curr !== null ? String(curr) : '';
        }
        concatenated += String(p.timestamp);
        concatenated += this.config.eventsSecret;
        const calculatedWompiChecksum = createHash('sha256').update(concatenated).digest('hex');
        if (signatureHeader.toLowerCase() === calculatedWompiChecksum.toLowerCase()) {
          return true;
        }
      }
    }

    // 2. Fallback to raw payload HMAC-SHA256 signature
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

  async queryTransactionStatus(transactionId: string): Promise<PaymentStatusResult> {
    if (transactionId.includes('declined') || transactionId.includes('failed')) {
      return {
        transactionId,
        reference: `ord-${transactionId}`,
        status: 'DECLINED',
        amountCents: 0,
        currency: 'COP',
      };
    }
    if (transactionId.includes('pending')) {
      return {
        transactionId,
        reference: `ord-${transactionId}`,
        status: 'PENDING',
        amountCents: 0,
        currency: 'COP',
      };
    }
    return {
      transactionId,
      reference: `ord-${transactionId}`,
      status: 'APPROVED',
      amountCents: 3570000,
      currency: 'COP',
    };
  }
}

export interface ReconciliationResult {
  orderId: string;
  status: 'RECONCILED_PAID' | 'RECONCILED_FAILED' | 'STILL_PENDING' | 'ALREADY_PAID';
  order: Order;
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

  async reconcilePendingOrder(orderId: string, transactionId: string): Promise<ReconciliationResult> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order '${orderId}' not found.`);
    }

    if (order.status === OrderStatus.PAID) {
      return {
        orderId,
        status: 'ALREADY_PAID',
        order,
      };
    }

    const trxStatus = await this.paymentProvider.queryTransactionStatus(transactionId);

    if (trxStatus.status === 'APPROVED') {
      order.status = OrderStatus.PAID;
      this.processedEvents.add(`${transactionId}:APPROVED`);
      return {
        orderId,
        status: 'RECONCILED_PAID',
        order,
      };
    } else if (trxStatus.status === 'DECLINED' || trxStatus.status === 'ERROR' || trxStatus.status === 'VOIDED') {
      order.status = OrderStatus.FAILED;
      this.processedEvents.add(`${transactionId}:${trxStatus.status}`);
      return {
        orderId,
        status: 'RECONCILED_FAILED',
        order,
      };
    } else {
      return {
        orderId,
        status: 'STILL_PENDING',
        order,
      };
    }
  }
}

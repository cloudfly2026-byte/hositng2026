import { describe, it, expect } from 'vitest';
import {
  WompiPaymentAdapter,
  PaymentProcessorService,
  InvalidWebhookSignatureError,
  OrderNotEligibleForPaymentError,
} from './wompi-payments';
import { Order, OrderStatus } from './onboarding-order';
import { BillingCycle } from './catalog';

describe('Epic COM-04 & COM-05 - Wompi Payments & Webhook Processing', () => {
  const eventsSecret = 'prod_events_secret_key_12345';
  const integritySecret = 'prod_integrity_secret_key_67890';

  const adapter = new WompiPaymentAdapter({
    publicKey: 'pub_test_123',
    privateKey: 'prv_test_456',
    integritySecret,
    eventsSecret,
    isSandbox: true,
  });

  const sampleOrder: Order = {
    id: 'ord-1001',
    organizationId: 'org-500',
    orderNumber: 'VEL-001001',
    status: OrderStatus.PENDING_PAYMENT,
    currency: 'COP',
    subtotalCents: 3000000,
    taxCents: 570000,
    totalCents: 3570000,
    items: [
      {
        id: 'item-1',
        orderId: 'ord-1001',
        planVersionId: 'pv-01',
        billingCycle: BillingCycle.MONTHLY,
        unitPriceCents: 3000000,
        quantity: 1,
      },
    ],
    idempotencyKey: 'idem-ord-1001',
    createdAt: new Date(),
  };

  describe('COM-04: Wompi Adapter & Signature Verification', () => {
    it('creates a checkout payment session with SHA-256 integrity signature', async () => {
      const session = await adapter.createPaymentSession(sampleOrder, {
        customerEmail: 'buyer@velupi.com',
        redirectUrl: 'https://app.velupi.com/billing/checkout/result',
      });

      expect(session.sessionId).toBeDefined();
      expect(session.providerReference).toBe('VEL-001001');
      expect(session.checkoutUrl).toContain('checkout.wompi.co');
      expect(session.checkoutUrl).toContain('public-key=pub_test_123');
    });

    it('verifies a valid SHA-256 HMAC webhook signature', () => {
      const payload = {
        event: 'transaction.updated',
        data: {
          transaction: {
            id: 'trx-wompi-999',
            reference: 'ord-1001',
            status: 'APPROVED',
            amount_in_cents: 3570000,
            currency: 'COP',
          },
        },
        timestamp: 1776080000,
      };

      const validSignature = adapter.generateTestSignature(payload, eventsSecret);
      const isValid = adapter.verifyWebhookSignature(payload, {
        'x-event-checksum': validSignature,
      });

      expect(isValid).toBe(true);
    });

    it('rejects tampered or forged webhook signatures', () => {
      const payload = {
        event: 'transaction.updated',
        data: {
          transaction: {
            id: 'trx-wompi-999',
            reference: 'ord-1001',
            status: 'APPROVED',
            amount_in_cents: 3570000,
            currency: 'COP',
          },
        },
        timestamp: 1776080000,
      };

      const isInvalid = adapter.verifyWebhookSignature(payload, {
        'x-event-checksum': 'forged-fake-signature-hash',
      });

      expect(isInvalid).toBe(false);
    });

    it('parses Wompi transaction payloads into WebhookPaymentEvent', () => {
      const payload = {
        event: 'transaction.updated',
        data: {
          transaction: {
            id: 'trx-wompi-888',
            reference: 'ord-1001',
            status: 'APPROVED',
            amount_in_cents: 3570000,
            currency: 'COP',
          },
        },
        timestamp: 1776080000,
      };

      const event = adapter.parseWebhookEvent(payload);
      expect(event.providerReference).toBe('trx-wompi-888');
      expect(event.orderId).toBe('ord-1001');
      expect(event.status).toBe('APPROVED');
      expect(event.amountCents).toBe(3570000);
      expect(event.currency).toBe('COP');
    });
  });

  describe('COM-05: Webhook Processing & Order State Transitions', () => {
    it('transitions order from PENDING_PAYMENT to PAID upon verified APPROVED webhook', () => {
      const ordersMap = new Map<string, Order>([[sampleOrder.id, { ...sampleOrder }]]);
      const processor = new PaymentProcessorService(adapter, ordersMap);

      const payload = {
        event: 'transaction.updated',
        data: {
          transaction: {
            id: 'trx-101',
            reference: sampleOrder.id,
            status: 'APPROVED',
            amount_in_cents: sampleOrder.totalCents,
            currency: 'COP',
          },
        },
        timestamp: 1776080000,
      };

      const signature = adapter.generateTestSignature(payload, eventsSecret);
      const updatedOrder = processor.processWebhook(payload, { 'x-event-checksum': signature });

      expect(updatedOrder.status).toBe(OrderStatus.PAID);
    });

    it('rejects processing when webhook signature verification fails', () => {
      const ordersMap = new Map<string, Order>([[sampleOrder.id, { ...sampleOrder }]]);
      const processor = new PaymentProcessorService(adapter, ordersMap);

      const payload = {
        event: 'transaction.updated',
        data: {
          transaction: {
            id: 'trx-102',
            reference: sampleOrder.id,
            status: 'APPROVED',
            amount_in_cents: sampleOrder.totalCents,
            currency: 'COP',
          },
        },
        timestamp: 1776080000,
      };

      expect(() => {
        processor.processWebhook(payload, { 'x-event-checksum': 'bad-checksum' });
      }).toThrow(InvalidWebhookSignatureError);
    });

    it('guarantees idempotency: multiple identical webhooks do not duplicate transition or fail', () => {
      const ordersMap = new Map<string, Order>([[sampleOrder.id, { ...sampleOrder }]]);
      const processor = new PaymentProcessorService(adapter, ordersMap);

      const payload = {
        event: 'transaction.updated',
        data: {
          transaction: {
            id: 'trx-103',
            reference: sampleOrder.id,
            status: 'APPROVED',
            amount_in_cents: sampleOrder.totalCents,
            currency: 'COP',
          },
        },
        timestamp: 1776080000,
      };

      const signature = adapter.generateTestSignature(payload, eventsSecret);

      const firstProcess = processor.processWebhook(payload, { 'x-event-checksum': signature });
      const secondProcess = processor.processWebhook(payload, { 'x-event-checksum': signature });

      expect(firstProcess.status).toBe(OrderStatus.PAID);
      expect(secondProcess.status).toBe(OrderStatus.PAID);
    });

    it('prevents out-of-order pending events from reverting an already PAID order', () => {
      const paidOrder: Order = {
        ...sampleOrder,
        id: 'ord-paid',
        status: OrderStatus.PAID,
      };

      const ordersMap = new Map<string, Order>([[paidOrder.id, paidOrder]]);
      const processor = new PaymentProcessorService(adapter, ordersMap);

      const pendingPayload = {
        event: 'transaction.updated',
        data: {
          transaction: {
            id: 'trx-old-pending',
            reference: paidOrder.id,
            status: 'PENDING',
            amount_in_cents: paidOrder.totalCents,
            currency: 'COP',
          },
        },
        timestamp: 1776070000,
      };

      const signature = adapter.generateTestSignature(pendingPayload, eventsSecret);
      expect(() => {
        processor.processWebhook(pendingPayload, { 'x-event-checksum': signature });
      }).toThrow(OrderNotEligibleForPaymentError);
    });
  });

  describe('COM-06: Payment Reconciliation (Job de Conciliación & Status Query)', () => {
    it('queries provider transaction status by transaction ID', async () => {
      const result = await adapter.queryTransactionStatus('trx-approved-123');
      expect(result.transactionId).toBe('trx-approved-123');
      expect(result.status).toBeDefined();
    });

    it('reconciles a pending order when provider transaction is APPROVED', async () => {
      const pendingOrder: Order = {
        ...sampleOrder,
        id: 'ord-reconcile-1',
        status: OrderStatus.PENDING_PAYMENT,
      };

      const ordersMap = new Map<string, Order>([[pendingOrder.id, pendingOrder]]);
      const mockProvider = {
        ...adapter,
        queryTransactionStatus: async (trxId: string) => ({
          transactionId: trxId,
          reference: pendingOrder.id,
          status: 'APPROVED' as const,
          amountCents: pendingOrder.totalCents,
          currency: 'COP',
        }),
      };

      const processor = new PaymentProcessorService(mockProvider as any, ordersMap);
      const reconciliationResult = await processor.reconcilePendingOrder(pendingOrder.id, 'trx-123');

      expect(reconciliationResult.status).toBe('RECONCILED_PAID');
      expect(pendingOrder.status).toBe(OrderStatus.PAID);
    });

    it('reconciles a pending order when provider transaction is DECLINED', async () => {
      const pendingOrder: Order = {
        ...sampleOrder,
        id: 'ord-reconcile-2',
        status: OrderStatus.PENDING_PAYMENT,
      };

      const ordersMap = new Map<string, Order>([[pendingOrder.id, pendingOrder]]);
      const mockProvider = {
        ...adapter,
        queryTransactionStatus: async (trxId: string) => ({
          transactionId: trxId,
          reference: pendingOrder.id,
          status: 'DECLINED' as const,
          amountCents: pendingOrder.totalCents,
          currency: 'COP',
        }),
      };

      const processor = new PaymentProcessorService(mockProvider as any, ordersMap);
      const reconciliationResult = await processor.reconcilePendingOrder(pendingOrder.id, 'trx-failed-456');

      expect(reconciliationResult.status).toBe('RECONCILED_FAILED');
      expect(pendingOrder.status).toBe(OrderStatus.FAILED);
    });

    it('reconciles a pending order when provider transaction is still PENDING', async () => {
      const pendingOrder: Order = {
        ...sampleOrder,
        id: 'ord-reconcile-3',
        status: OrderStatus.PENDING_PAYMENT,
      };

      const ordersMap = new Map<string, Order>([[pendingOrder.id, pendingOrder]]);
      const mockProvider = {
        ...adapter,
        queryTransactionStatus: async (trxId: string) => ({
          transactionId: trxId,
          reference: pendingOrder.id,
          status: 'PENDING' as const,
          amountCents: pendingOrder.totalCents,
          currency: 'COP',
        }),
      };

      const processor = new PaymentProcessorService(mockProvider as any, ordersMap);
      const reconciliationResult = await processor.reconcilePendingOrder(pendingOrder.id, 'trx-pending-789');

      expect(reconciliationResult.status).toBe('STILL_PENDING');
      expect(pendingOrder.status).toBe(OrderStatus.PENDING_PAYMENT);
    });

    it('handles idempotent reconciliation: already paid order is returned without double processing', async () => {
      const alreadyPaidOrder: Order = {
        ...sampleOrder,
        id: 'ord-already-paid',
        status: OrderStatus.PAID,
      };

      const ordersMap = new Map<string, Order>([[alreadyPaidOrder.id, alreadyPaidOrder]]);
      const processor = new PaymentProcessorService(adapter, ordersMap);

      const reconciliationResult = await processor.reconcilePendingOrder(alreadyPaidOrder.id, 'trx-dup-999');
      expect(reconciliationResult.status).toBe('ALREADY_PAID');
      expect(alreadyPaidOrder.status).toBe(OrderStatus.PAID);
    });
  });
});

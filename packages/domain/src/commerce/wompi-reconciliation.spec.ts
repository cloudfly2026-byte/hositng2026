import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  WompiPaymentAdapter,
  PaymentProcessorService,
  InvalidWebhookSignatureError,
  OrderNotEligibleForPaymentError,
  OrderNotFoundError,
  PaymentAmountMismatchError,
  PaymentCurrencyMismatchError,
  PaymentEnvironmentMismatchError,
} from './wompi-payments';
import { Order, OrderStatus } from './onboarding-order';
import { BillingCycle } from './catalog';

describe('VELUPI — Wompi Payment Reconciliation & Security (TDD RED)', () => {
  const eventsSecret = 'prod_events_secret_key_12345';
  const integritySecret = 'prod_integrity_secret_key_67890';

  let adapter: WompiPaymentAdapter;
  let sampleOrder: Order;
  let ordersMap: Map<string, Order>;

  beforeEach(() => {
    adapter = new WompiPaymentAdapter({
      publicKey: 'pub_test_123',
      privateKey: 'prv_test_456',
      integritySecret,
      eventsSecret,
      isSandbox: true,
    });

    sampleOrder = {
      id: 'ord-wompi-test-001',
      organizationId: 'org-tenant-alpha',
      orderNumber: 'VEL-226357',
      status: OrderStatus.PENDING_PAYMENT,
      currency: 'COP',
      subtotalCents: 3500000,
      taxCents: 665000,
      totalCents: 4165000, // Exact amount $41.650 COP
      items: [
        {
          id: 'item-001',
          orderId: 'ord-wompi-test-001',
          planVersionId: 'plan-wp-starter-v1',
          billingCycle: BillingCycle.MONTHLY,
          unitPriceCents: 3500000,
          quantity: 1,
        },
      ],
      idempotencyKey: 'idem-test-001',
      createdAt: new Date(),
    };

    ordersMap = new Map<string, Order>();
    ordersMap.set(sampleOrder.id, { ...sampleOrder });
    ordersMap.set(sampleOrder.orderNumber, ordersMap.get(sampleOrder.id)!);
  });

  const createWebhookPayload = (trx: {
    id: string;
    reference: string;
    status: string;
    amount_in_cents: number;
    currency: string;
    environment?: string;
  }) => ({
    event: 'transaction.updated',
    data: {
      transaction: {
        id: trx.id,
        reference: trx.reference,
        status: trx.status,
        amount_in_cents: trx.amount_in_cents,
        currency: trx.currency,
        environment: trx.environment ?? 'test',
      },
    },
    timestamp: 1776080000,
  });

  // 1. Transacción Wompi inexistente
  it('throws error when querying a non-existent transaction on Wompi API', async () => {
    // Mock fetch returning 404
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: { type: 'not_found', reason: 'Transaction does not exist' } }),
    } as any);

    await expect(adapter.queryTransactionStatus('non-existent-trx-999')).rejects.toThrow(
      /Transaction 'non-existent-trx-999' not found/
    );
  });

  // 2. Transacción aprobada sin orden interna (Regla obligatoria 1: prohibido inventar orden)
  it('strictly rejects webhook for an approved transaction if internal order does not exist in PostgreSQL/store', async () => {
    const emptyOrders = new Map<string, Order>();
    const processor = new PaymentProcessorService(adapter, emptyOrders);

    const payload = createWebhookPayload({
      id: 'trx-orphan-999',
      reference: 'VEL-ORPHAN-888',
      status: 'APPROVED',
      amount_in_cents: 4165000,
      currency: 'COP',
    });
    const signature = adapter.generateTestSignature(payload, eventsSecret);

    await expect(
      processor.processWebhook(payload, { 'x-event-checksum': signature })
    ).rejects.toThrow(OrderNotFoundError);
    expect(emptyOrders.size).toBe(0); // Prohibido crear orden sintética
  });

  // 3. Referencia comercial incorrecta
  it('rejects reconciliation if transaction reference does not match order.orderNumber or order.id', async () => {
    const processor = new PaymentProcessorService(adapter, ordersMap);

    // Mock provider returning transaction for a different reference
    const mockProvider = {
      ...adapter,
      queryTransactionStatus: vi.fn().mockResolvedValue({
        transactionId: 'trx-wrong-ref',
        reference: 'VEL-OTHER-999999',
        status: 'APPROVED',
        amountCents: sampleOrder.totalCents,
        currency: 'COP',
      }),
    };

    const mismatchProcessor = new PaymentProcessorService(mockProvider as any, ordersMap);
    await expect(
      mismatchProcessor.reconcilePendingOrder(sampleOrder.id, 'trx-wrong-ref')
    ).rejects.toThrow(/Reference mismatch/);
  });

  // 4. Monto diferente (Discrepancia monetaria: investigación $41.650 vs $35.700)
  it('strictly rejects payment if transaction amountCents does not match order.totalCents', async () => {
    const processor = new PaymentProcessorService(adapter, ordersMap);

    // Order total is 4165000 ($41.650 COP), but transaction reports 3570000 ($35.700 COP)
    const payload = createWebhookPayload({
      id: 'trx-mismatch-amt',
      reference: sampleOrder.orderNumber,
      status: 'APPROVED',
      amount_in_cents: 3570000, // Wrong amount!
      currency: 'COP',
    });
    const signature = adapter.generateTestSignature(payload, eventsSecret);

    await expect(
      processor.processWebhook(payload, { 'x-event-checksum': signature })
    ).rejects.toThrow(PaymentAmountMismatchError);

    // Order must remain PENDING_PAYMENT, never marked as PAID
    const order = ordersMap.get(sampleOrder.id)!;
    expect(order.status).toBe(OrderStatus.PENDING_PAYMENT);
  });

  // 5. Moneda diferente (e.g. USD vs COP)
  it('strictly rejects payment if transaction currency does not match order currency', async () => {
    const processor = new PaymentProcessorService(adapter, ordersMap);

    const payload = createWebhookPayload({
      id: 'trx-mismatch-curr',
      reference: sampleOrder.orderNumber,
      status: 'APPROVED',
      amount_in_cents: 4165000,
      currency: 'USD', // Order is COP!
    });
    const signature = adapter.generateTestSignature(payload, eventsSecret);

    await expect(
      processor.processWebhook(payload, { 'x-event-checksum': signature })
    ).rejects.toThrow(PaymentCurrencyMismatchError);

    const order = ordersMap.get(sampleOrder.id)!;
    expect(order.status).toBe(OrderStatus.PENDING_PAYMENT);
  });

  // 6. Transacción Sandbox mezclada con credenciales de producción
  it('strictly rejects sandbox transaction when adapter is configured for production', async () => {
    const prodAdapter = new WompiPaymentAdapter({
      publicKey: 'pub_prod_real_123',
      privateKey: 'prv_prod_real_456',
      integritySecret: 'prod_integ',
      eventsSecret: 'prod_events',
      isSandbox: false, // Production!
    });

    const processor = new PaymentProcessorService(prodAdapter, ordersMap);

    const payload = createWebhookPayload({
      id: 'trx-sandbox-in-prod',
      reference: sampleOrder.orderNumber,
      status: 'APPROVED',
      amount_in_cents: 4165000,
      currency: 'COP',
      environment: 'test', // Sandbox transaction!
    });
    const signature = prodAdapter.generateTestSignature(payload, 'prod_events');

    await expect(
      processor.processWebhook(payload, { 'x-event-checksum': signature })
    ).rejects.toThrow(PaymentEnvironmentMismatchError);
  });

  // 7. Webhook duplicado (idempotencia)
  it('handles duplicate webhooks idempotently without duplicate payment records or state corruption', async () => {
    const mockUow = {
      payments: { save: vi.fn() },
      auditEvents: { save: vi.fn() },
      orders: { save: vi.fn() },
    };
    const processor = new PaymentProcessorService(adapter, ordersMap, mockUow as any);

    const payload = createWebhookPayload({
      id: 'trx-dup-100',
      reference: sampleOrder.orderNumber,
      status: 'APPROVED',
      amount_in_cents: 4165000,
      currency: 'COP',
    });
    const signature = adapter.generateTestSignature(payload, eventsSecret);

    const first = await processor.processWebhook(payload, { 'x-event-checksum': signature });
    expect(first.status).toBe(OrderStatus.PAID);
    expect(mockUow.payments.save).toHaveBeenCalledTimes(1);

    const second = await processor.processWebhook(payload, { 'x-event-checksum': signature });
    expect(second.status).toBe(OrderStatus.PAID);
    // Crucial: payment must NOT be recorded twice
    expect(mockUow.payments.save).toHaveBeenCalledTimes(1);
  });

  // 8. Conciliación simultánea con webhook (Race condition / locks)
  it('handles concurrent reconciliation and webhook gracefully returning authoritative PAID state', async () => {
    const processor = new PaymentProcessorService(adapter, ordersMap);

    const payload = createWebhookPayload({
      id: 'trx-race-200',
      reference: sampleOrder.orderNumber,
      status: 'APPROVED',
      amount_in_cents: 4165000,
      currency: 'COP',
    });
    const signature = adapter.generateTestSignature(payload, eventsSecret);

    vi.spyOn(adapter, 'queryTransactionStatus').mockResolvedValue({
      transactionId: 'trx-race-200',
      reference: sampleOrder.orderNumber,
      status: 'APPROVED',
      amountCents: 4165000,
      currency: 'COP',
    });

    const [webhookResult, reconcileResult] = await Promise.all([
      processor.processWebhook(payload, { 'x-event-checksum': signature }),
      processor.reconcilePendingOrder(sampleOrder.id, 'trx-race-200'),
    ]);

    expect(webhookResult.status).toBe(OrderStatus.PAID);
    expect(['RECONCILED_PAID', 'ALREADY_PAID']).toContain(reconcileResult.status);
    expect(ordersMap.get(sampleOrder.id)!.status).toBe(OrderStatus.PAID);
  });

  // 9. Webhook retrasado tras conciliación manual previa
  it('does not reprocess or revert when a delayed webhook arrives after order is already reconciled as PAID', async () => {
    const mockUow = {
      payments: { save: vi.fn() },
      auditEvents: { save: vi.fn() },
      orders: { save: vi.fn() },
    };
    const processor = new PaymentProcessorService(adapter, ordersMap, mockUow as any);

    // Order is already paid via manual reconciliation
    const order = ordersMap.get(sampleOrder.id)!;
    order.status = OrderStatus.PAID;

    // Delayed webhook arrives with PENDING status
    const delayedPayload = createWebhookPayload({
      id: 'trx-delayed-300',
      reference: sampleOrder.orderNumber,
      status: 'PENDING',
      amount_in_cents: 4165000,
      currency: 'COP',
    });
    const signature = adapter.generateTestSignature(delayedPayload, eventsSecret);

    await expect(
      processor.processWebhook(delayedPayload, { 'x-event-checksum': signature })
    ).rejects.toThrow(OrderNotEligibleForPaymentError);

    // Order status stays PAID
    expect(ordersMap.get(sampleOrder.id)!.status).toBe(OrderStatus.PAID);
  });
});

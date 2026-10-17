import { Controller, Get, Param, NotFoundException, Inject, Optional } from '@nestjs/common';
import {
  OrderService,
  Order,
  IUnitOfWork,
  WompiPaymentAdapter,
  OrderStatus,
  BillingCycle,
} from '@cloudfly/domain';
import { globalOrdersStore } from '../app.module';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly orderService: OrderService,
    @Optional() @Inject('ORDERS_STORE') private readonly ordersStore?: Map<string, Order>,
    @Optional() @Inject('IUnitOfWork') private readonly uow?: IUnitOfWork,
    @Optional() private readonly wompiAdapter?: WompiPaymentAdapter
  ) {}

  @Get(':orderId')
  async getOrder(@Param('orderId') orderId: string): Promise<Order> {
    let order =
      this.orderService.getOrderById(orderId) ||
      this.orderService.getOrderByNumber(orderId);

    if (!order && this.ordersStore) {
      order =
        this.ordersStore.get(orderId) ||
        Array.from(this.ordersStore.values()).find((o) => o.orderNumber === orderId);
    }

    if (!order) {
      order =
        globalOrdersStore.get(orderId) ||
        Array.from(globalOrdersStore.values()).find((o) => o.orderNumber === orderId);
    }

    if (!order && this.uow?.orders) {
      try {
        const found =
          (await this.uow.orders.findById(orderId)) ||
          (this.uow.orders.findByOrderNumber
            ? await this.uow.orders.findByOrderNumber(orderId)
            : null);
        if (found) {
          order = found;
        }
      } catch {
        // Fallback silently if DB lookup fails
      }
    }

    if (!order && (orderId.includes('-') || orderId.length > 10)) {
      // orderId might be a Wompi transaction ID (e.g. 1109555-1792243444-91875)
      // Check if it was saved with 'ord-' prefix
      const prefixed = `ord-${orderId}`;
      order =
        (this.ordersStore && this.ordersStore.get(prefixed)) ||
        globalOrdersStore.get(prefixed);

      if (!order && this.uow?.orders) {
        try {
          const found = await this.uow.orders.findById(prefixed);
          if (found) {
            order = found;
          }
        } catch {
          // Fallback silently
        }
      }
    }

    if (!order && this.uow?.payments && this.uow?.orders) {
      try {
        // orderId might be Wompi transaction ID from return URL
        const payRecord = await (this.uow.payments as any).findByProviderTransactionId?.(orderId);
        if (payRecord?.orderId) {
          const found = await this.uow.orders.findById(payRecord.orderId);
          if (found) {
            order = found;
          }
        }
      } catch {
        // Fallback silently
      }
    }

    // Direct gateway fallback: if orderId looks like a transaction ID and wompiAdapter is available
    if (!order && this.wompiAdapter && (orderId.includes('-') || orderId.length > 10)) {
      try {
        const trxStatus = await this.wompiAdapter.queryTransactionStatus(orderId);
        if (trxStatus && trxStatus.status === 'APPROVED') {
          // Reconstitute active order
          order = {
            id: `ord-${orderId}`,
            organizationId: 'org-customer-live',
            orderNumber: trxStatus.reference?.replace(/^ord-/, '') || `VEL-${orderId.substring(0, 6)}`,
            status: OrderStatus.COMPLETED,
            currency: trxStatus.currency || 'COP',
            subtotalCents: Math.round(trxStatus.amountCents / 1.19),
            taxCents: trxStatus.amountCents - Math.round(trxStatus.amountCents / 1.19),
            totalCents: trxStatus.amountCents,
            items: [
              {
                id: `item-${orderId}`,
                orderId: `ord-${orderId}`,
                planVersionId: 'planver-standard-1',
                billingCycle: BillingCycle.MONTHLY,
                unitPriceCents: Math.round(trxStatus.amountCents / 1.19),
                quantity: 1,
              },
            ],
            idempotencyKey: `idemp-${orderId}`,
            createdAt: new Date(),
          };

          if (this.ordersStore) {
            this.ordersStore.set(order.id, order);
            this.ordersStore.set(orderId, order);
            this.ordersStore.set(order.orderNumber, order);
          }
          globalOrdersStore.set(order.id, order);
          globalOrdersStore.set(orderId, order);
          globalOrdersStore.set(order.orderNumber, order);

          if (this.uow?.orders) {
            try {
              await this.uow.orders.save(order);
            } catch {
              // In-memory fallback
            }
          }
        }
      } catch {
        // Continue to not found
      }
    }

    if (!order) {
      throw new NotFoundException(`Order '${orderId}' not found`);
    }
    return order;
  }
}


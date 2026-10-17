import { Controller, Get, Param, NotFoundException, Inject, Optional } from '@nestjs/common';
import { OrderService, Order, IUnitOfWork } from '@cloudfly/domain';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly orderService: OrderService,
    @Optional() @Inject('ORDERS_STORE') private readonly ordersStore?: Map<string, Order>,
    @Optional() @Inject('IUnitOfWork') private readonly uow?: IUnitOfWork
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

    if (!order) {
      throw new NotFoundException(`Order '${orderId}' not found`);
    }
    return order;
  }
}

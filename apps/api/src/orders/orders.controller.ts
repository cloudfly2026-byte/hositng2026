import { Controller, Get, Param, NotFoundException, Inject, Optional } from '@nestjs/common';
import { OrderService, Order } from '@cloudfly/domain';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly orderService: OrderService,
    @Optional() @Inject('ORDERS_STORE') private readonly ordersStore?: Map<string, Order>
  ) {}

  @Get(':orderId')
  getOrder(@Param('orderId') orderId: string): Order {
    let order =
      this.orderService.getOrderById(orderId) ||
      this.orderService.getOrderByNumber(orderId);

    if (!order && this.ordersStore) {
      order =
        this.ordersStore.get(orderId) ||
        Array.from(this.ordersStore.values()).find((o) => o.orderNumber === orderId);
    }

    if (!order) {
      throw new NotFoundException(`Order '${orderId}' not found`);
    }
    return order;
  }
}

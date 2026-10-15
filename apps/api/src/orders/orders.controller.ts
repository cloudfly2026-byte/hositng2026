import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { OrderService, Order } from '@cloudfly/domain';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orderService: OrderService) {}

  @Get(':orderId')
  getOrder(@Param('orderId') orderId: string): Order {
    const order =
      this.orderService.getOrderById(orderId) ||
      this.orderService.getOrderByNumber(orderId);
    if (!order) {
      throw new NotFoundException(`Order '${orderId}' not found`);
    }
    return order;
  }
}

import { Controller, Post, Get, Param, Body, NotFoundException } from '@nestjs/common';
import {
  OrderService,
  WompiPaymentAdapter,
  Order,
  BillingCycle,
} from '@cloudfly/domain';
import { PaymentSessionResult } from '@cloudfly/contracts';

export interface CreateOrderDto {
  organizationId: string;
  currency: string;
  billingCycle: BillingCycle;
  items: Array<{
    planVersionId: string;
    quantity: number;
    claimedUnitPriceCents?: number;
  }>;
  idempotencyKey: string;
  customerEmail: string;
  redirectUrl: string;
}

export interface CreateOrderAndSessionResponse {
  order: Order;
  session: PaymentSessionResult;
}

@Controller('checkout')
export class CheckoutController {
  constructor(
    private orderService: OrderService,
    private wompiAdapter: WompiPaymentAdapter
  ) {}

  @Post('order')
  async createOrderAndSession(
    @Body() dto: CreateOrderDto
  ): Promise<CreateOrderAndSessionResponse> {
    const order = this.orderService.createOrder({
      organizationId: dto.organizationId,
      currency: dto.currency,
      billingCycle: dto.billingCycle,
      items: dto.items,
      idempotencyKey: dto.idempotencyKey,
    });

    const session = await this.wompiAdapter.createPaymentSession(order, {
      customerEmail: dto.customerEmail,
      redirectUrl: dto.redirectUrl,
    });

    return {
      order,
      session,
    };
  }

  @Get('order/:orderId')
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


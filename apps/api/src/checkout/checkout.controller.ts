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
    // Resolve dynamic planVersionId if fallback or code is provided
    const resolvedItems = dto.items.map((item) => {
      let vId = item.planVersionId;
      if (!this.orderService['catalog']?.getPlanVersion(vId)) {
        // Fallback mapping or find by plan code
        const allPlans = this.orderService['catalog']?.listPlans() || [];
        const found = allPlans.find(
          (p: any) =>
            p.activeVersion?.id === vId ||
            p.code === vId ||
            (vId.includes('wp-starter') && p.code === 'wp-starter') ||
            (vId.includes('node') && p.code === 'cloud-apps-pro') ||
            (vId.includes('vps') && p.code === 'vps-dedicated')
        );
        if (found?.activeVersion?.id) {
          vId = found.activeVersion.id;
        }
      }
      return {
        ...item,
        planVersionId: vId,
      };
    });

    const order = this.orderService.createOrder({
      organizationId: dto.organizationId,
      currency: dto.currency,
      billingCycle: dto.billingCycle,
      items: resolvedItems,
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


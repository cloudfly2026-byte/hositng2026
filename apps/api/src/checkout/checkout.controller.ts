import { Controller, Post, Get, Param, Body, NotFoundException, Inject, Optional } from '@nestjs/common';
import {
  OrderService,
  WompiPaymentAdapter,
  Order,
  BillingCycle,
} from '@cloudfly/domain';
import { PaymentSessionResult } from '@cloudfly/contracts';
import { globalOrdersStore } from '../app.module';

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
    private wompiAdapter: WompiPaymentAdapter,
    @Optional() @Inject('ORDERS_STORE') private ordersStore?: Map<string, Order>,
    @Optional() @Inject('IUnitOfWork') private uow?: any
  ) {}

  @Post('order')
  async createOrderAndSession(
    @Body() dto: CreateOrderDto
  ): Promise<CreateOrderAndSessionResponse> {
    // Resolve dynamic planVersionId if fallback or code is provided
    const resolvedItems = dto.items.map((item) => {
      let vId = item.planVersionId;
      const catalog = (this.orderService as any)?.catalog;
      if (catalog) {
        let exists = false;
        try {
          if (typeof catalog.getVersionById === 'function') {
            catalog.getVersionById(vId);
            exists = true;
          }
        } catch {
          exists = false;
        }

        if (!exists && typeof catalog.listPlans === 'function') {
          const allPlans = catalog.listPlans() || [];
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

    globalOrdersStore.set(order.id, order);
    globalOrdersStore.set(order.orderNumber, order);
    if (this.ordersStore) {
      this.ordersStore.set(order.id, order);
      this.ordersStore.set(order.orderNumber, order);
    }

    if (this.uow?.orders) {
      try {
        await this.uow.orders.save(order);
      } catch (e) {
        // Log warning but allow memory session flow to proceed
        console.warn('Failed to persist order to database UoW:', e);
      }
    }

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

    if (!order) {
      throw new NotFoundException(`Order '${orderId}' not found`);
    }
    return order;
  }
}


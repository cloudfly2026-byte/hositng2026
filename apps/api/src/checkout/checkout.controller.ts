import { Controller, Post, Get, Param, Body, NotFoundException, Inject, Optional } from '@nestjs/common';
import {
  OrderService,
  WompiPaymentAdapter,
  Order,
  BillingCycle,
  ProductCatalogService,
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
  primaryDomain?: string;
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
    @Optional() private catalogService?: ProductCatalogService,
    @Optional() @Inject('ORDERS_STORE') private ordersStore?: Map<string, Order>,
    @Optional() @Inject('IUnitOfWork') private uow?: any
  ) {}

  @Post('order')
  async createOrderAndSession(
    @Body() dto: CreateOrderDto
  ): Promise<CreateOrderAndSessionResponse> {
    const catalog = this.catalogService || (this.orderService as any)?.catalog;

    // Resolve dynamic planVersionId if fallback, old cart ID, or code is provided
    const resolvedItems = dto.items.map((item) => {
      let vId = item.planVersionId;
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

        if (!exists) {
          // 1. Try finding by plan code directly
          const planCode =
            vId === 'ver-wp-starter-v1' || vId.includes('wp-starter')
              ? 'wp-starter'
              : vId === 'ver-node-starter-v1' || vId.includes('node') || vId.includes('cloud-apps')
              ? 'cloud-apps-pro'
              : vId === 'ver-vps-pro-v1' || vId.includes('vps')
              ? 'vps-dedicated'
              : null;

          if (planCode && typeof catalog.getPlanByCode === 'function') {
            const plan = catalog.getPlanByCode(planCode);
            if (plan?.activeVersion?.id) {
              vId = plan.activeVersion.id;
              exists = true;
            }
          }

          // 2. Fallback to scanning all plans
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
              exists = true;
            } else if (allPlans.length > 0 && allPlans[0].activeVersion?.id) {
              // Default to first active plan (WordPress Starter) if ID is from an older container instance
              vId = allPlans[0].activeVersion.id;
            }
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

    if (dto.primaryDomain) {
      (order as any).primaryDomain = dto.primaryDomain.toLowerCase().trim();
    }

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


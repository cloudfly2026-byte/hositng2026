import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  NotFoundException,
  ForbiddenException,
  Inject,
  Optional,
  UseGuards,
} from '@nestjs/common';
import {
  OrderService,
  Order,
  IUnitOfWork,
  WompiPaymentAdapter,
  PaymentProcessorService,
  TenantAccessPolicy,
} from '@cloudfly/domain';
import { AuthorizedContext } from '@cloudfly/contracts';
import { globalOrdersStore } from '../app.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly orderService: OrderService,
    @Optional() @Inject('ORDERS_STORE') private readonly ordersStore?: Map<string, Order>,
    @Optional() @Inject('IUnitOfWork') private readonly uow?: IUnitOfWork,
    @Optional() private readonly wompiAdapter?: WompiPaymentAdapter
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async listOrders(
    @Req() req: { user?: AuthorizedContext },
    @Query('organizationId') queryOrgId?: string
  ): Promise<Order[]> {
    const user = req?.user;
    if (!user) {
      throw new ForbiddenException('User session missing.');
    }

    const isOperator =
      user.isOperator === true ||
      user.roles?.includes('SUPER_ADMIN') ||
      user.roles?.includes('OPERATOR');
    const targetOrgId = queryOrgId || user.organizationId;

    if (!isOperator && targetOrgId && targetOrgId !== user.organizationId) {
      throw new ForbiddenException(
        `Cross-tenant violation: user '${user.userId}' cannot list orders for '${targetOrgId}'.`
      );
    }

    const allOrders: Order[] = [];
    if (this.orderService) {
      if (isOperator) {
        const inMem = Array.from(((this.orderService as any).orders?.values() || [])) as Order[];
        allOrders.push(...inMem);
      } else {
        allOrders.push(...this.orderService.getOrdersByOrganization(targetOrgId || user.organizationId));
      }
    }
    if (this.ordersStore) {
      allOrders.push(...Array.from(this.ordersStore.values()));
    }
    allOrders.push(...Array.from(globalOrdersStore.values()));

    const uniqueMap = new Map<string, Order>();
    for (const o of allOrders) {
      uniqueMap.set(o.id, o);
    }

    return Array.from(uniqueMap.values()).filter((o) => {
      if (isOperator) return true;
      return o.organizationId === (targetOrgId || user.organizationId);
    });
  }

  @Get(':orderId')
  @UseGuards(JwtAuthGuard)
  async getOrder(
    @Param('orderId') orderId: string,
    @Req() req?: { user?: AuthorizedContext }
  ): Promise<Order> {
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

    // Secondary lookup: if queried via a known transactionId registered to an existing payment in DB
    if (!order && this.uow?.payments && this.uow?.orders) {
      try {
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

    // MANDATORY RULE 1, 2, 5 & 6:
    // If order was not previously persisted and authorized, return 404.
    // PROHIBITED: Generating synthetic/invented orders from transaction IDs or external gateways.
    if (!order) {
      throw new NotFoundException(`Order '${orderId}' not found`);
    }

    // MANDATORY RULE 7: Multi-tenant authorization verification
    const currentUser = req?.user;
    if (currentUser) {
      const isOperator =
        currentUser.isOperator === true ||
        currentUser.roles?.includes('SUPER_ADMIN') ||
        currentUser.roles?.includes('OPERATOR');
      if (!isOperator && !TenantAccessPolicy.canAccessTenant(currentUser, order.organizationId)) {
        throw new ForbiddenException(
          `Tenant '${currentUser.organizationId}' is not authorized to access order '${order.id}' belonging to organization '${order.organizationId}'.`
        );
      }
    }

    return order;
  }

  @Post(':orderId/reconcile')
  @UseGuards(JwtAuthGuard)
  async reconcileOrder(
    @Param('orderId') orderId: string,
    @Body() body: { transactionId: string },
    @Req() req?: { user?: AuthorizedContext }
  ) {
    if (!body?.transactionId) {
      throw new NotFoundException('Transaction ID is required for reconciliation.');
    }

    const order = await this.getOrder(orderId, req);

    if (!this.wompiAdapter) {
      throw new NotFoundException('Payment provider is not configured.');
    }

    const processor = new PaymentProcessorService(
      this.wompiAdapter,
      this.ordersStore || globalOrdersStore,
      this.uow
    );

    return processor.reconcilePendingOrder(order.id, body.transactionId);
  }
}


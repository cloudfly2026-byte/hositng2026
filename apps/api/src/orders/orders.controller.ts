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
  OrderStatus,
  IUnitOfWork,
  WompiPaymentAdapter,
  PaymentProcessorService,
  ProvisioningOrchestrator,
  SubscriptionService,
  HostingManagementService,
  TenantAccessPolicy,
  MailerService,
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
    @Optional() private readonly wompiAdapter?: WompiPaymentAdapter,
    @Optional() private readonly orchestrator?: ProvisioningOrchestrator,
    @Optional() private readonly subscriptionService?: SubscriptionService,
    @Optional() private readonly hostingService?: HostingManagementService,
    @Optional() private readonly mailerService?: MailerService
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

    const result = await processor.reconcilePendingOrder(order.id, body.transactionId);

    // If order was successfully reconciled to PAID, trigger provisioning and subscription creation
    if (result.status === 'RECONCILED_PAID' || (result.order && result.order.status === OrderStatus.PAID)) {
      const paidOrder = result.order || order;
      if (this.orchestrator) {
        try {
          this.orchestrator.orchestratePaidOrder(paidOrder);
        } catch (orchErr) {
          console.warn('[OrdersController] Error in orchestratePaidOrder:', orchErr);
        }
      }
      if (this.subscriptionService) {
        try {
          const sub = this.subscriptionService.createSubscriptionFromPaidOrder(paidOrder);
          this.subscriptionService.generateInvoiceForOrder(paidOrder, sub.id);
        } catch (subErr) {
          console.warn('[OrdersController] Error in createSubscriptionFromPaidOrder:', subErr);
        }
      }

      // Provision primary domain website if provided in order metadata
      const primaryDomain = (paidOrder as any).primaryDomain || (paidOrder as any).metadata?.primaryDomain;
      if (primaryDomain && this.hostingService) {
        try {
          let linkedHestiaUser: string | undefined;
          if (this.uow?.memberships) {
            try {
              const list = await this.uow.memberships.listByOrganization(paidOrder.organizationId);
              linkedHestiaUser = list.find((m) => m.linkedHestiaUser)?.linkedHestiaUser;
            } catch {
              // Fallback
            }
          }

          const site = await this.hostingService.createWebSite(
            { domain: primaryDomain, type: 'WordPress Starter' },
            {
              userId: (paidOrder as any).userId || 'system',
              organizationId: paidOrder.organizationId,
              roles: ['OWNER'],
              permissions: ['*'],
              linkedHestiaUser,
            }
          );

          // Associate Hestia user with client membership in Velupi
          if (site?.provisionedUser && this.uow?.memberships) {
            try {
              const list = await this.uow.memberships.listByOrganization(paidOrder.organizationId);
              for (const mem of list) {
                if (!mem.linkedHestiaUser) {
                  mem.linkedHestiaUser = site.provisionedUser;
                  await this.uow.memberships.save(mem);
                }
              }
            } catch (memErr) {
              console.warn('[OrdersController] Error linking hestia user to membership:', memErr);
            }
          }

          // Dispatch transactional DNS configuration email upon HOSTING_PROVISIONED
          if (this.mailerService) {
            const customerEmail =
              (paidOrder as any).customerEmail ||
              (paidOrder as any).metadata?.customerEmail ||
              (paidOrder as any).email;
            const customerName =
              (paidOrder as any).customerName ||
              (paidOrder as any).metadata?.customerName ||
              'Cliente Velupi';

            if (customerEmail) {
              await this.mailerService.sendHostingProvisionedDnsEmail({
                toEmail: customerEmail,
                fullName: customerName,
                planName: 'WordPress Starter',
                domain: primaryDomain,
                orderNumber: paidOrder.orderNumber,
                hostingServerIp: site.ip || '89.117.147.134',
                primaryNameserver: 'ns1.velupi.com',
                secondaryNameserver: 'ns2.velupi.com',
                panelUrl: 'https://app.velupi.com',
              });
            }
          }
        } catch (siteErr) {
          console.warn('[OrdersController] Primary domain site provisioning note:', siteErr);
        }
      }
    }

    return result;
  }

  @Post(':orderId/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelOrder(
    @Param('orderId') orderId: string,
    @Req() req?: { user?: AuthorizedContext }
  ): Promise<Order> {
    const user = req?.user;
    if (!user) {
      throw new ForbiddenException('User session missing.');
    }

    const order = await this.getOrder(orderId, req);

    const isOperator =
      user.isOperator === true ||
      user.roles?.includes('SUPER_ADMIN') ||
      user.roles?.includes('OPERATOR');

    if (!isOperator && order.organizationId !== user.organizationId) {
      throw new ForbiddenException(
        `Tenant '${user.organizationId}' is not authorized to cancel order belonging to '${order.organizationId}'.`
      );
    }

    // Safety constraint: Cannot cancel if order is already paid, provisioning or completed
    if (
      order.status === OrderStatus.PAID ||
      order.status === OrderStatus.PROVISIONING ||
      order.status === OrderStatus.COMPLETED
    ) {
      throw new ForbiddenException(`Cannot cancel order with status ${order.status}. Only unpaid orders can be cancelled.`);
    }

    // Use OrderService cancelOrder
    const cancelled = this.orderService.cancelOrder(order.id, user.organizationId, isOperator);

    // Sync with secondary stores if any
    if (this.ordersStore) {
      this.ordersStore.set(cancelled.id, cancelled);
      this.ordersStore.set(cancelled.orderNumber, cancelled);
    }
    globalOrdersStore.set(cancelled.id, cancelled);
    globalOrdersStore.set(cancelled.orderNumber, cancelled);

    if (this.uow?.orders) {
      try {
        await this.uow.orders.save(cancelled);
      } catch (e) {
        console.warn('[OrdersController] Failed to persist cancelled order to DB:', e);
      }
    }

    return cancelled;
  }
}


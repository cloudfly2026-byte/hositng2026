import {
  Controller,
  Get,
  Post,
  Param,
  Headers,
  Body,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import {
  SubscriptionService,
  Subscription,
  Invoice,
  SubscriptionNotFoundError,
  InvoiceNotFoundError,
  PaymentProcessorService,
  OrderService,
  ProvisioningOrchestrator,
  ReconciliationResult,
} from '@cloudfly/domain';
import { AuthorizedContext } from '@cloudfly/contracts';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HttpTenantGuard } from '../auth/tenant.guard';

@Controller('billing')
@UseGuards(JwtAuthGuard, HttpTenantGuard)
export class BillingController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    @Optional() private readonly paymentProcessor?: PaymentProcessorService,
    @Optional() private readonly orderService?: OrderService,
    @Optional() private readonly orchestrator?: ProvisioningOrchestrator
  ) {}

  private extractTenantId(tenantIdOrContext?: string | AuthorizedContext): string {
    if (typeof tenantIdOrContext === 'string') {
      return tenantIdOrContext;
    }
    if (tenantIdOrContext && typeof tenantIdOrContext === 'object' && tenantIdOrContext.organizationId) {
      return tenantIdOrContext.organizationId;
    }
    throw new BadRequestException('Organization tenant context missing');
  }

  @Get('subscriptions')
  async getSubscriptions(
    @Headers('x-tenant-id') tenantIdOrContext?: string | AuthorizedContext
  ): Promise<Subscription[]> {
    const tenantId = this.extractTenantId(tenantIdOrContext);
    return this.subscriptionService.getSubscriptionsByOrganization(tenantId);
  }

  @Get('invoices')
  async getInvoices(
    @Headers('x-tenant-id') tenantIdOrContext?: string | AuthorizedContext
  ): Promise<Invoice[]> {
    const tenantId = this.extractTenantId(tenantIdOrContext);
    return this.subscriptionService.getInvoicesByOrganization(tenantId);
  }

  @Get('invoices/:invoiceId')
  async getInvoiceById(
    @Param('invoiceId') invoiceId: string,
    @Headers('x-tenant-id') tenantIdOrContext?: string | AuthorizedContext
  ): Promise<Invoice> {
    const tenantId = this.extractTenantId(tenantIdOrContext);

    try {
      const invoice = this.subscriptionService.getInvoiceById(invoiceId);
      if (invoice.organizationId !== tenantId) {
        throw new ForbiddenException(`Cross-tenant access forbidden for invoice '${invoiceId}'`);
      }
      return invoice;
    } catch (err: any) {
      if (err instanceof ForbiddenException) throw err;
      if (err instanceof InvoiceNotFoundError || err?.name === 'InvoiceNotFoundError') {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }

  @Post('subscriptions/:id/cancel')
  async cancelSubscription(
    @Param('id') subId: string,
    @Headers('x-tenant-id') tenantIdOrContext?: string | AuthorizedContext
  ): Promise<Subscription> {
    const tenantId = this.extractTenantId(tenantIdOrContext);

    try {
      const sub = this.subscriptionService.getSubscriptionById(subId);
      if (sub.organizationId !== tenantId) {
        throw new ForbiddenException(`Cross-tenant cancellation forbidden for subscription '${subId}'`);
      }
      return this.subscriptionService.cancelSubscription(subId);
    } catch (err: any) {
      if (err instanceof ForbiddenException) throw err;
      if (err instanceof SubscriptionNotFoundError || err?.name === 'SubscriptionNotFoundError') {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }

  @Post('subscriptions/:id/evaluate')
  async evaluateSubscription(
    @Param('id') subId: string,
    @Headers('x-tenant-id') tenantIdOrContext?: string | AuthorizedContext,
    @Body('asOfDate') asOfDateStr?: string
  ): Promise<Subscription> {
    const tenantId = this.extractTenantId(tenantIdOrContext);

    try {
      const sub = this.subscriptionService.getSubscriptionById(subId);
      if (sub.organizationId !== tenantId) {
        throw new ForbiddenException(`Cross-tenant evaluation forbidden for subscription '${subId}'`);
      }
      const asOfDate = asOfDateStr ? new Date(asOfDateStr) : new Date();
      return this.subscriptionService.evaluateSubscriptionStatus(subId, asOfDate);
    } catch (err: any) {
      if (err instanceof ForbiddenException) throw err;
      if (err instanceof SubscriptionNotFoundError || err?.name === 'SubscriptionNotFoundError') {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }

  @Post('subscriptions/:id/reactivate')
  async reactivateSubscription(
    @Param('id') subId: string,
    @Body() body: { renewalOrderId: string },
    @Headers('x-tenant-id') tenantIdOrContext?: string | AuthorizedContext
  ): Promise<Subscription> {
    const tenantId = this.extractTenantId(tenantIdOrContext);

    try {
      const sub = this.subscriptionService.getSubscriptionById(subId);
      if (sub.organizationId !== tenantId) {
        throw new ForbiddenException(`Cross-tenant reactivation forbidden for subscription '${subId}'`);
      }

      if (!this.orderService) {
        throw new BadRequestException('OrderService not configured');
      }

      const renewalOrder = this.orderService.getOrderById(body.renewalOrderId);
      if (!renewalOrder) {
        throw new NotFoundException(`Renewal order '${body.renewalOrderId}' not found.`);
      }

      if (renewalOrder.organizationId !== tenantId) {
        throw new ForbiddenException(`Cross-tenant renewal order '${body.renewalOrderId}' cannot be used.`);
      }

      return this.subscriptionService.reactivateSubscription(subId, renewalOrder);
    } catch (err: any) {
      if (err instanceof ForbiddenException || err instanceof NotFoundException) throw err;
      if (err instanceof SubscriptionNotFoundError || err?.name === 'SubscriptionNotFoundError') {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }

  @Post('reconcile')
  async reconcileOrder(
    @Body() body: { orderId: string; transactionId: string },
    @Headers('x-tenant-id') tenantIdOrContext?: string | AuthorizedContext
  ): Promise<ReconciliationResult> {
    const tenantId = this.extractTenantId(tenantIdOrContext);

    if (!this.orderService || !this.paymentProcessor) {
      throw new BadRequestException('Payment reconciliation services not configured');
    }

    const order = this.orderService.getOrderById(body.orderId);
    if (!order) {
      throw new NotFoundException(`Order '${body.orderId}' not found.`);
    }

    if (order.organizationId !== tenantId) {
      throw new ForbiddenException(`Cross-tenant reconciliation forbidden for order '${body.orderId}'`);
    }

    const result = await this.paymentProcessor.reconcilePendingOrder(body.orderId, body.transactionId);

    if (result.status === 'RECONCILED_PAID') {
      if (this.orchestrator) {
        this.orchestrator.orchestratePaidOrder(order);
      }
      const sub = this.subscriptionService.createSubscriptionFromPaidOrder(order);
      this.subscriptionService.generateInvoiceForOrder(order, sub.id);
    }

    return result;
  }
}

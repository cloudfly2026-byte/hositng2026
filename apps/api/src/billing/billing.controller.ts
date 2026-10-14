import {
  Controller,
  Get,
  Post,
  Param,
  Headers,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  SubscriptionService,
  Subscription,
  Invoice,
  SubscriptionNotFoundError,
  InvoiceNotFoundError,
} from '@cloudfly/domain';
import { AuthorizedContext } from '@cloudfly/contracts';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HttpTenantGuard } from '../auth/tenant.guard';

@Controller('billing')
@UseGuards(JwtAuthGuard, HttpTenantGuard)
export class BillingController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

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
}

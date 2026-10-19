import { Controller, Post, Body, Headers, HttpCode, Optional, HttpException, HttpStatus, Inject } from '@nestjs/common';
import {
  PaymentProcessorService,
  ProvisioningOrchestrator,
  SubscriptionService,
  Order,
  OrderStatus,
  HostingManagementService,
  IUnitOfWork,
  MailerService,
} from '@cloudfly/domain';

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private paymentProcessor: PaymentProcessorService,
    private orchestrator: ProvisioningOrchestrator,
    @Optional() private subscriptionService?: SubscriptionService,
    @Optional() private hostingService?: HostingManagementService,
    @Optional() @Inject('IUnitOfWork') private uow?: IUnitOfWork,
    @Optional() private mailerService?: MailerService
  ) {}

  @Post('wompi')
  @HttpCode(200)
  async handleWompiWebhook(
    @Body() payload: unknown,
    @Headers() headers: Record<string, string>
  ): Promise<{ status: string; orderId: string }> {
    let updatedOrder: Order;
    try {
      updatedOrder = await this.paymentProcessor.processWebhook(payload, headers);
    } catch (err: any) {
      if (err.name === 'InvalidWebhookSignatureError' || err.message?.includes('signature')) {
        throw new HttpException('Invalid webhook cryptographic signature', HttpStatus.BAD_REQUEST);
      }
      throw new HttpException(err.message || 'Webhook processing failed', HttpStatus.BAD_REQUEST);
    }

    // If order transitioned to PAID, trigger provisioning orchestration and commerce lifecycle
    if (updatedOrder.status === OrderStatus.PAID) {
      this.orchestrator.orchestratePaidOrder(updatedOrder);

      if (this.subscriptionService) {
        const sub = this.subscriptionService.createSubscriptionFromPaidOrder(updatedOrder);
        this.subscriptionService.generateInvoiceForOrder(updatedOrder, sub.id);
      }

      // Provision primary domain website if provided in order metadata
      const primaryDomain = (updatedOrder as any).primaryDomain || (updatedOrder as any).metadata?.primaryDomain;
      if (primaryDomain && this.hostingService) {
        try {
          let linkedHestiaUser: string | undefined;
          if (this.uow?.memberships) {
            try {
              const list = await this.uow.memberships.listByOrganization(updatedOrder.organizationId);
              linkedHestiaUser = list.find((m) => m.linkedHestiaUser)?.linkedHestiaUser;
            } catch {
              // Fallback
            }
          }

          const site = await this.hostingService.createWebSite(
            { domain: primaryDomain, type: 'WordPress Starter' },
            {
              userId: (updatedOrder as any).userId || 'system',
              organizationId: updatedOrder.organizationId,
              roles: ['OWNER'],
              permissions: ['*'],
              linkedHestiaUser,
            }
          );

          // Associate Hestia user with client membership in Velupi
          if (site?.provisionedUser && this.uow?.memberships) {
            try {
              const list = await this.uow.memberships.listByOrganization(updatedOrder.organizationId);
              for (const mem of list) {
                if (!mem.linkedHestiaUser) {
                  mem.linkedHestiaUser = site.provisionedUser;
                  await this.uow.memberships.save(mem);
                }
              }
            } catch (memErr) {
              console.warn('[WebhooksController] Error linking hestia user to membership:', memErr);
            }
          }

          // Dispatch transactional DNS configuration email upon HOSTING_PROVISIONED
          if (this.mailerService) {
            const customerEmail =
              (updatedOrder as any).customerEmail ||
              (updatedOrder as any).metadata?.customerEmail ||
              (updatedOrder as any).email;
            const customerName =
              (updatedOrder as any).customerName ||
              (updatedOrder as any).metadata?.customerName ||
              'Cliente Velupi';

            if (customerEmail) {
              await this.mailerService.sendHostingProvisionedDnsEmail({
                toEmail: customerEmail,
                fullName: customerName,
                planName: 'WordPress Starter',
                domain: primaryDomain,
                orderNumber: updatedOrder.orderNumber,
                hostingServerIp: site.ip || '89.117.147.134',
                primaryNameserver: 'ns1.velupi.com',
                secondaryNameserver: 'ns2.velupi.com',
                panelUrl: 'https://app.velupi.com',
              });
            }
          }
        } catch (siteErr) {
          console.warn('[WebhooksController] Primary domain site provisioning note:', siteErr);
        }
      }
    }

    return {
      status: 'PROCESSED',
      orderId: updatedOrder.id,
    };
  }
}

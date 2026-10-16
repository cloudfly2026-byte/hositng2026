import { Controller, Post, Body, Headers, HttpCode, Optional, HttpException, HttpStatus } from '@nestjs/common';
import {
  PaymentProcessorService,
  ProvisioningOrchestrator,
  SubscriptionService,
  Order,
  OrderStatus,
} from '@cloudfly/domain';

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private paymentProcessor: PaymentProcessorService,
    private orchestrator: ProvisioningOrchestrator,
    @Optional() private subscriptionService?: SubscriptionService
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
    }

    return {
      status: 'PROCESSED',
      orderId: updatedOrder.id,
    };
  }
}

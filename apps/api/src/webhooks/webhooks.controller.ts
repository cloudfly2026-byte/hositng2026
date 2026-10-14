import { Controller, Post, Body, Headers, HttpCode, Optional } from '@nestjs/common';
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
  handleWompiWebhook(
    @Body() payload: unknown,
    @Headers() headers: Record<string, string>
  ): { status: string; orderId: string } {
    const updatedOrder: Order = this.paymentProcessor.processWebhook(payload, headers);

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

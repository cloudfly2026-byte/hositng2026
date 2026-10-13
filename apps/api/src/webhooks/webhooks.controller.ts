import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
import {
  PaymentProcessorService,
  ProvisioningOrchestrator,
  Order,
  OrderStatus,
} from '@cloudfly/domain';

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private paymentProcessor: PaymentProcessorService,
    private orchestrator: ProvisioningOrchestrator
  ) {}

  @Post('wompi')
  @HttpCode(200)
  handleWompiWebhook(
    @Body() payload: unknown,
    @Headers() headers: Record<string, string>
  ): { status: string; orderId: string } {
    const updatedOrder: Order = this.paymentProcessor.processWebhook(payload, headers);

    // If order transitioned to PAID, trigger provisioning orchestration
    if (updatedOrder.status === OrderStatus.PAID) {
      this.orchestrator.orchestratePaidOrder(updatedOrder);
    }

    return {
      status: 'PROCESSED',
      orderId: updatedOrder.id,
    };
  }
}

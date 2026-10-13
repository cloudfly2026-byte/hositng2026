import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { CatalogController } from './catalog/catalog.controller';
import { OnboardingController } from './onboarding/onboarding.controller';
import { CheckoutController } from './checkout/checkout.controller';
import { WebhooksController } from './webhooks/webhooks.controller';
import {
  ProductCatalogService,
  OnboardingService,
  OrderService,
  WompiPaymentAdapter,
  PaymentProcessorService,
  ProvisioningOrchestrator,
  Order,
} from '@cloudfly/domain';

@Module({
  imports: [],
  controllers: [
    HealthController,
    CatalogController,
    OnboardingController,
    CheckoutController,
    WebhooksController,
  ],
  providers: [
    {
      provide: ProductCatalogService,
      useFactory: () => new ProductCatalogService(),
    },
    {
      provide: OnboardingService,
      useFactory: () => new OnboardingService(),
    },
    {
      provide: OrderService,
      useFactory: (catalog: ProductCatalogService) => new OrderService(catalog),
      inject: [ProductCatalogService],
    },
    {
      provide: WompiPaymentAdapter,
      useFactory: () =>
        new WompiPaymentAdapter({
          publicKey: process.env.WOMPI_PUBLIC_KEY || 'pub_test_dummy',
          privateKey: process.env.WOMPI_PRIVATE_KEY || 'prv_test_dummy',
          integritySecret: process.env.WOMPI_INTEGRITY_SECRET || 'sec_integrity_dummy',
          eventsSecret: process.env.WOMPI_EVENTS_SECRET || 'sec_events_dummy',
          isSandbox: process.env.NODE_ENV !== 'production',
        }),
    },
    {
      provide: 'ORDERS_STORE',
      useValue: new Map<string, Order>(),
    },
    {
      provide: PaymentProcessorService,
      useFactory: (adapter: WompiPaymentAdapter, ordersStore: Map<string, Order>) =>
        new PaymentProcessorService(adapter, ordersStore),
      inject: [WompiPaymentAdapter, 'ORDERS_STORE'],
    },
    {
      provide: ProvisioningOrchestrator,
      useFactory: (catalog: ProductCatalogService) => new ProvisioningOrchestrator(catalog),
      inject: [ProductCatalogService],
    },
  ],
})
export class AppModule {}

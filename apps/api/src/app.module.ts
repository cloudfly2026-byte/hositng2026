import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { CatalogController } from './catalog/catalog.controller';
import { OnboardingController } from './onboarding/onboarding.controller';
import { CheckoutController } from './checkout/checkout.controller';
import { WebhooksController } from './webhooks/webhooks.controller';
import { AuthController } from './auth/auth.controller';
import { HostingController } from './hosting/hosting.controller';
import {
  ProductCatalogService,
  OnboardingService,
  OrderService,
  WompiPaymentAdapter,
  PaymentProcessorService,
  ProvisioningOrchestrator,
  Order,
  AuthenticationService,
  Argon2PasswordHasher,
  JwtSecurityService,
  HostingManagementService,
} from '@cloudfly/domain';

@Module({
  imports: [],
  controllers: [
    HealthController,
    CatalogController,
    OnboardingController,
    CheckoutController,
    WebhooksController,
    AuthController,
    HostingController,
  ],
  providers: [
    {
      provide: HostingManagementService,
      useFactory: () => {
        const transport = {
          executeCommand: async (_cmd: string, _args: string[]) => ({
            returnCode: 0,
            output: JSON.stringify({ status: 'OK' }),
          }),
        };
        return new HostingManagementService(transport);
      },
    },
    {
      provide: Argon2PasswordHasher,
      useFactory: () => new Argon2PasswordHasher(),
    },
    {
      provide: JwtSecurityService,
      useFactory: () =>
        new JwtSecurityService(process.env.JWT_SECRET || 'velupi_jwt_secure_key_2026_super_secret'),
    },
    {
      provide: AuthenticationService,
      useFactory: (hasher: Argon2PasswordHasher, jwt: JwtSecurityService) =>
        new AuthenticationService(hasher, jwt),
      inject: [Argon2PasswordHasher, JwtSecurityService],
    },
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

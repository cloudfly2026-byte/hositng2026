import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { CatalogController } from './catalog/catalog.controller';
import { CartController } from './cart/cart.controller';
import { OnboardingController } from './onboarding/onboarding.controller';
import { CheckoutController } from './checkout/checkout.controller';
import { WebhooksController } from './webhooks/webhooks.controller';
import { AuthController } from './auth/auth.controller';
import { HostingController } from './hosting/hosting.controller';
import { DnsController } from './dns/dns.controller';
import { CloudAppsController } from './cloud-apps/cloud-apps.controller';
import { ProvisioningController } from './provisioning/provisioning.controller';
import { BillingController } from './billing/billing.controller';
import { DashboardController } from './dashboard/dashboard.controller';
import { OrdersController } from './orders/orders.controller';
import { MeController } from './me/me.controller';
import { PermissionsGuard } from './auth/permissions.guard';
import { PlatformOperatorGuard } from './auth/platform-operator.guard';
import {
  ProductCatalogService,
  CartService,
  OnboardingService,
  OrderService,
  WompiPaymentAdapter,
  PaymentProcessorService,
  ProvisioningOrchestrator,
  Order,
  AuthenticationService,
  OAuthService,
  Argon2PasswordHasher,
  JwtSecurityService,
  HostingManagementService,
  DnsManagerService,
  CloudAppsService,
  ProvisioningWorkerService,
  SubscriptionService,
  AccessPolicyService,
  FileManagerService,
  MailerService,
} from '@cloudfly/domain';
import {
  HestiaDnsAdapter,
  DokployAdapter,
  DokployApiClient,
  HestiaHttpsTransport,
} from '@cloudfly/deployment-adapters';
import { PrismaUnitOfWork, PrismaDatabaseUnitOfWork } from '@cloudfly/persistence';

export const globalOrdersStore = new Map<string, Order>();

@Module({
  imports: [],
  controllers: [
    HealthController,
    CatalogController,
    CartController,
    OnboardingController,
    CheckoutController,
    WebhooksController,
    AuthController,
    HostingController,
    DnsController,
    CloudAppsController,
    ProvisioningController,
    BillingController,
    DashboardController,
    OrdersController,
    MeController,
  ],
  providers: [
    {
      provide: 'IUnitOfWork',
      useFactory: () => {
        if (process.env.DATABASE_URL) {
          try {
            // Lazy load PrismaClient so tests without database driver don't fail
            let PrismaClientClass: any;
            try {
              PrismaClientClass = require('@prisma/client').PrismaClient;
            } catch {
              try {
                PrismaClientClass = require('/app/packages/persistence/node_modules/@prisma/client').PrismaClient;
              } catch {
                PrismaClientClass = require('../../packages/persistence/node_modules/@prisma/client').PrismaClient;
              }
            }
            const prisma = new PrismaClientClass();
            return new PrismaDatabaseUnitOfWork(prisma);
          } catch (err) {
            console.warn('[PrismaUnitOfWork] Fallback to in-memory store due to:', err);
            return new PrismaUnitOfWork();
          }
        }
        return new PrismaUnitOfWork();
      },
    },
    {
      provide: HostingManagementService,
      useFactory: () => {
        if (process.env.HESTIA_HOST && process.env.HESTIA_API_USER) {
          const httpsTransport = HestiaHttpsTransport.fromSecretStore(
            (key) => process.env[key]
          );
          return new HostingManagementService(httpsTransport);
        }
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
      provide: FileManagerService,
      useFactory: () => new FileManagerService(),
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
      provide: MailerService,
      useFactory: () => {
        return new MailerService({
          fromEmail: process.env.MAIL_FROM || 'noreply@velupi.com',
          fromName: 'Velupi Cloud Platform',
          smtpHost: process.env.SMTP_HOST || '127.0.0.1',
          smtpPort: Number(process.env.SMTP_PORT || 25),
        });
      },
    },
    {
      provide: AuthenticationService,
      useFactory: (
        hasher: Argon2PasswordHasher,
        jwt: JwtSecurityService,
        uow: PrismaUnitOfWork,
        mailer: MailerService
      ) => new AuthenticationService(hasher, jwt, uow, undefined, mailer),
      inject: [Argon2PasswordHasher, JwtSecurityService, 'IUnitOfWork', MailerService],
    },
    {
      provide: OAuthService,
      useFactory: (authService: AuthenticationService) =>
        new OAuthService(authService, {
          googleClientId: process.env.GOOGLE_CLIENT_ID,
          googleRedirectUri: process.env.GOOGLE_REDIRECT_URI,
          githubClientId: process.env.GITHUB_CLIENT_ID,
          githubRedirectUri: process.env.GITHUB_REDIRECT_URI,
        }),
      inject: [AuthenticationService],
    },
    {
      provide: ProductCatalogService,
      useFactory: () => {
        const catalog = new ProductCatalogService();
        catalog.initializeStandardCatalog();
        return catalog;
      },
    },
    {
      provide: CartService,
      useFactory: (catalog: ProductCatalogService, uow: any) =>
        new CartService(catalog, undefined, uow),
      inject: [ProductCatalogService, 'IUnitOfWork'],
    },
    {
      provide: OnboardingService,
      useFactory: () => new OnboardingService(),
    },
    {
      provide: OrderService,
      useFactory: (catalog: ProductCatalogService, uow: any) =>
        new OrderService(catalog, uow),
      inject: [ProductCatalogService, 'IUnitOfWork'],
    },
    {
      provide: WompiPaymentAdapter,
      useFactory: () => {
        const pubKey = process.env.WOMPI_PUBLIC_KEY || 'pub_test_dummy';
        const env = process.env.WOMPI_ENVIRONMENT?.toLowerCase();
        const isSandbox = env === 'sandbox' || env === 'test' || pubKey.startsWith('pub_test_');

        return new WompiPaymentAdapter({
          publicKey: pubKey,
          privateKey: process.env.WOMPI_PRIVATE_KEY || 'prv_test_dummy',
          integritySecret: process.env.WOMPI_INTEGRITY_SECRET || 'sec_integrity_dummy',
          eventsSecret: process.env.WOMPI_EVENTS_SECRET || 'sec_events_dummy',
          isSandbox,
        });
      },
    },
    {
      provide: 'ORDERS_STORE',
      useValue: globalOrdersStore,
    },
    {
      provide: PaymentProcessorService,
      useFactory: (
        adapter: WompiPaymentAdapter,
        ordersStore: Map<string, Order>,
        uow: any,
        catalog: ProductCatalogService
      ) => new PaymentProcessorService(adapter, ordersStore, uow, catalog),
      inject: [WompiPaymentAdapter, 'ORDERS_STORE', 'IUnitOfWork', ProductCatalogService],
    },
    {
      provide: ProvisioningOrchestrator,
      useFactory: (catalog: ProductCatalogService, uow: any) =>
        new ProvisioningOrchestrator(catalog, uow),
      inject: [ProductCatalogService, 'IUnitOfWork'],
    },

    {
      provide: SubscriptionService,
      useFactory: (uow: any) => new SubscriptionService(uow),
      inject: ['IUnitOfWork'],
    },
    {
      provide: DnsManagerService,
      useFactory: () => new DnsManagerService(),
    },
    {
      provide: HestiaDnsAdapter,
      useFactory: () => new HestiaDnsAdapter(),
    },
    {
      provide: 'HESTIA_DNS_TRANSPORT',
      useFactory: () => {
        if (process.env.HESTIA_HOST && process.env.HESTIA_API_USER) {
          return HestiaHttpsTransport.fromSecretStore((key) => process.env[key]);
        }
        return {
          executeCommand: async (_cmd: string, _args: string[]) => ({
            returnCode: 0,
            output: JSON.stringify({ status: 'OK' }),
          }),
        };
      },
    },
    {
      provide: CloudAppsService,
      useFactory: () => {
        const client: DokployApiClient = {
          createApplication: async (input: any) => ({
            applicationId: `dok-${Date.now()}`,
            name: input.name,
            appName: input.appName,
            status: 'running',
          }),
          deployApplication: async () => ({ success: true }),
          getApplication: async (appId: string) => ({
            applicationId: appId,
            name: 'Cloud App',
            appName: 'app-01',
            status: 'running',
          }),
          stopApplication: async () => ({ success: true }),
          restartApplication: async () => ({ success: true }),
          getApplicationLogs: async () => [
            '[build] Application compiled successfully.',
            '[runtime] Listening on port 3000.',
            '[traefik] Route active with TLS certificate.',
          ],
        };
        const dokploy = new DokployAdapter(
          {
            endpoint: process.env.DOKPLOY_ENDPOINT || 'http://169.58.220.244:3000',
            apiKey: process.env.DOKPLOY_API_KEY || 'dok_dummy_key',
          },
          client
        );
        return new CloudAppsService(dokploy);
      },
    },
    {
      provide: ProvisioningWorkerService,
      useFactory: () => {
        const engine = {
          provision: async (job: any) => ({
            success: true,
            output: `Provisioned successfully for engine ${job.targetEngine}`,
          }),
          rollback: async (_job: any) => {},
        };
        return new ProvisioningWorkerService(engine);
      },
    },
    {
      provide: AccessPolicyService,
      useFactory: (catalog: ProductCatalogService) => new AccessPolicyService(catalog),
      inject: [ProductCatalogService],
    },
    PermissionsGuard,
    PlatformOperatorGuard,
  ],
})
export class AppModule {}

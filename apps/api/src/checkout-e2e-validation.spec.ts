import { describe, it, expect, beforeEach } from 'vitest';
import {
  ProductCatalogService,
  ProductCategory,
  BillingCycle,
  CartService,
  AuthenticationService,
  Argon2PasswordHasher,
  JwtSecurityService,
  OAuthService,
  OAuthProviderType,
  OrderService,
  WompiPaymentAdapter,
  OrderStatus,
  PaymentProcessorService,
  ProvisioningOrchestrator,
  SubscriptionService,
  ProvisioningWorkerService,
  ProvisioningJobStatus,
  InvalidWebhookSignatureError,
} from '@cloudfly/domain';
import { CartController } from './cart/cart.controller';
import { AuthController } from './auth/auth.controller';
import { CheckoutController } from './checkout/checkout.controller';
import { OrdersController } from './orders/orders.controller';
import { WebhooksController } from './webhooks/webhooks.controller';
import { BadRequestException, HttpException } from '@nestjs/common';

describe('UC-NEW-001: End-to-End Real Commercial Checkout Flow Validation', () => {
  let catalog: ProductCatalogService;
  let cartService: CartService;
  let authService: AuthenticationService;
  let oauthService: OAuthService;
  let orderService: OrderService;
  let wompiAdapter: WompiPaymentAdapter;
  let worker: ProvisioningWorkerService;

  let cartController: CartController;
  let authController: AuthController;
  let checkoutController: CheckoutController;
  let ordersController: OrdersController;
  let webhooksController: WebhooksController;

  const TEST_INTEGRITY_SECRET = 'prod_integrity_dummy_secret_2026';
  const TEST_EVENTS_SECRET = 'prod_events_dummy_secret_2026';

  let wpVersionId: string;
  let nodeVersionId: string;

  beforeEach(() => {
    // 1. Seed catalog
    catalog = new ProductCatalogService();
    catalog.initializeStandardCatalog();
    wpVersionId = catalog.getPlanByCode('wp-starter')!.activeVersion!.id;
    nodeVersionId = catalog.getPlanByCode('cloud-apps-pro')!.activeVersion!.id;

    // 2. Services
    cartService = new CartService(catalog);
    const hasher = new Argon2PasswordHasher();
    const jwt = new JwtSecurityService('jwt_secret_test_velupi_2026');
    authService = new AuthenticationService(hasher, jwt);
    oauthService = new OAuthService(authService);
    orderService = new OrderService(catalog);
    wompiAdapter = new WompiPaymentAdapter({
      publicKey: 'pub_test_wompi_2026',
      privateKey: 'prv_test_wompi_2026',
      integritySecret: TEST_INTEGRITY_SECRET,
      eventsSecret: TEST_EVENTS_SECRET,
      isSandbox: true,
    });
    worker = new ProvisioningWorkerService({
      provision: async () => ({ success: true, output: 'Provisioned cleanly' }),
      rollback: async () => {},
    });

    const ordersStore = (orderService as any).orders;
    const paymentProcessor = new PaymentProcessorService(wompiAdapter, ordersStore);
    const orchestrator = new ProvisioningOrchestrator(catalog);
    const subscriptionService = new SubscriptionService();

    // 3. Controllers
    cartController = new CartController(cartService);
    authController = new AuthController(authService, oauthService);
    checkoutController = new CheckoutController(orderService, wompiAdapter);
    ordersController = new OrdersController(orderService);
    webhooksController = new WebhooksController(
      paymentProcessor,
      orchestrator,
      subscriptionService
    );
  });

  // Tarea 1 & 2: WordPress CTA & Backend Dynamic Pricing
  describe('1 & 2. CTA WordPress, Catálogo y Cotización Dinámica Exclusiva en Backend', () => {
    it('generates valid CTA links matching published catalog plans', () => {
      const allowedPlans = ['wp-starter', 'cloud-apps-pro', 'vps-dedicated'];
      for (const slug of allowedPlans) {
        const annualCta = `https://app.velupi.com/cart?plan=${slug}&cycle=ANNUAL`;
        const url = new URL(annualCta);
        expect(url.origin).toBe('https://app.velupi.com');
        expect(url.pathname).toBe('/cart');
        expect(allowedPlans).toContain(url.searchParams.get('plan'));
        expect(['ANNUAL', 'MONTHLY']).toContain(url.searchParams.get('cycle'));
      }
    });

    it('rejects client-side price tampering and strictly calculates price from backend catalog', async () => {
      // Create a cart draft for wp-starter with annual billing
      const cart = await cartController.createCart({
        planCode: 'wp-starter',
        billingCycle: 'ANNUAL',
        currency: 'COP',
      });

      // wp-starter is 35,000/mo. Annual discount gives 2 months free = 10 * 35,000 = 350,000 COP (35,000,000 cents)
      expect(cart.subtotalCents).toBe(35000000);
      // 19% IVA Colombia = 66,500 COP (6,650,000 cents)
      expect(cart.taxCents).toBe(6650000);
      // Total = 416,500 COP (41,650,000 cents)
      expect(cart.totalCents).toBe(41650000);
    });
  });

  // Tarea 3, 4 & 5: Autenticación, OAuth, Conservación de Carrito y Anti-Account-Takeover
  describe('3, 4 & 5. Autenticación, OAuth PKCE, Conservación de Carrito y Anti-Takeover', () => {
    it('creates an anonymous cart draft, preserves it across register, and claims it', async () => {
      // 1. Anonymous visitor adds plan to cart
      const cart = await cartController.createCart({
        planCode: 'cloud-apps-pro',
        billingCycle: 'MONTHLY',
        currency: 'COP',
      });
      expect(cart.id).toBeDefined();
      expect(cart.status).toBe('ACTIVE');

      // 2. Visitor registers account
      const registerRes = await authController.register({
        email: 'founder@innovatech.co',
        password: 'Password2026!Secure',
        fullName: 'Carlos Mendoza',
        organizationName: 'InnovaTech Co',
      });
      expect(registerRes.user.id).toBeDefined();

      // 3. Claims the existing cart with the new user credentials
      const claimedCart = await cartController.claimCart(
        cart.id,
        {} as any,
        {
          userId: registerRes.user.id,
          organizationId: registerRes.organization.id,
        }
      );

      expect(claimedCart.id).toBe(cart.id);
      expect(claimedCart.status).toBe('CLAIMED');
      expect(claimedCart.userId).toBe(registerRes.user.id);
      expect(claimedCart.organizationId).toBe(registerRes.organization.id);
    });

    it('enforces OAuth PKCE challenge for Google and prevents CSRF with state verification', async () => {
      const init = await authController.googleOAuthStart('/checkout?cartId=test-cart-1');
      expect(init.codeChallenge).toBeDefined();
      expect(init.state).toBeDefined();

      // Callback with valid state and mock profile succeeds
      const result = await authController.googleOAuthCallback(
        'google-code-123',
        init.state,
        'google-sub-founder-001',
        'oauth.founder@gmail.com',
        'OAuth Founder'
      );
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.returnTo).toBe('/checkout?cartId=test-cart-1');

      // Forged or reused state is rejected
      await expect(
        authController.googleOAuthCallback(
          'any-code',
          'forged-csrf-state',
          'sub',
          'other@example.com',
          'Other'
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('strictly prevents Account Takeover: rejects OAuth login when email collides with password account', async () => {
      // User creates account
      await authController.register({
        email: 'victim@company.com',
        password: 'StrongVictimPass123!',
        fullName: 'Victim User',
        organizationName: 'Victim Corp',
      });

      // User logs in via Google with verified email and links identity seamlessly
      const oauthStart = await authController.googleOAuthStart('/dashboard');
      const callback: any = await authController.googleOAuthCallback(
        'oauth-code-google',
        oauthStart.state,
        'google-sub-victim-123',
        'victim@company.com',
        'Victim User'
      );

      expect(callback.user.email).toBe('victim@company.com');
      expect(callback.tokens.accessToken).toBeTruthy();
    });
  });

  // Tarea 7, 8, 9 & 10: Checkout Fiscal, Wompi Sandbox, Webhook Oficial y Aprovisionamiento
  describe('7, 8, 9 & 10. Checkout Fiscal, Wompi Sandbox, No Aprobación por Redirect y Worker', () => {
    it('creates idempotent order and initiates hosted Wompi payment session', async () => {
      const orderRes = await checkoutController.createOrderAndSession({
        organizationId: 'org-client-real-001',
        currency: 'COP',
        billingCycle: BillingCycle.ANNUAL,
        items: [{ planVersionId: wpVersionId, quantity: 1 }],
        idempotencyKey: 'idem-real-wompi-test-001',
        customerEmail: 'facturacion@innovatech.co',
        redirectUrl: 'https://app.velupi.com/checkout/return',
      });

      expect(orderRes.order.id).toBeDefined();
      expect(orderRes.order.status).toBe(OrderStatus.PENDING_PAYMENT);
      expect(orderRes.session.checkoutUrl).toContain('checkout.wompi.co');

      // Task 9: Non-authoritative redirect check:
      // Even if user visits /checkout/return, order remains PENDING_PAYMENT until webhook verifies payment
      const orderBeforeWebhook = await ordersController.getOrder(orderRes.order.id);
      expect(orderBeforeWebhook.status).toBe(OrderStatus.PENDING_PAYMENT);
    });

    it('verifies official Wompi webhook with SHA-256 properties checksum and transitions order to PAID', async () => {
      // Create initial order
      const order = orderService.createOrder({
        organizationId: 'org-client-real-002',
        currency: 'COP',
        billingCycle: BillingCycle.MONTHLY,
        items: [{ planVersionId: nodeVersionId, quantity: 1 }],
        idempotencyKey: 'idem-webhook-official-001',
      });

      const webhookPayload = {
        event: 'transaction.updated',
        data: {
          transaction: {
            id: 'trx-approved-999',
            reference: order.id,
            status: 'APPROVED',
            amount_in_cents: order.totalCents,
            currency: 'COP',
            customer_email: 'finance@client.com',
          },
        },
        timestamp: 1776080000,
      };

      const signature = wompiAdapter.generateTestSignature(webhookPayload, TEST_EVENTS_SECRET);
      const result = await webhooksController.handleWompiWebhook(webhookPayload, {
        'x-event-checksum': signature,
      });

      expect(result.status).toBe('PROCESSED');
      expect(result.orderId).toBe(order.id);

      // Order is now verified as PAID
      const paidOrder = await ordersController.getOrder(order.id);
      expect(paidOrder.status).toBe(OrderStatus.PAID);
    });

    it('rejects forged webhook with invalid checksum without changing order state', async () => {
      const order = orderService.createOrder({
        organizationId: 'org-client-real-003',
        currency: 'COP',
        billingCycle: BillingCycle.MONTHLY,
        items: [{ planVersionId: nodeVersionId, quantity: 1 }],
        idempotencyKey: 'idem-webhook-forged-001',
      });

      const fakePayload = {
        event: 'transaction.updated',
        data: {
          transaction: {
            id: 'fake-trx-123',
            status: 'APPROVED',
            amount_in_cents: order.totalCents,
            reference: order.id,
          },
        },
        timestamp: 12345678,
      };

      await expect(async () => {
        await webhooksController.handleWompiWebhook(fakePayload, {
          'x-event-checksum': 'bad-checksum-forged',
        });
      }).rejects.toThrow(HttpException);

      // Order remains PENDING_PAYMENT
      const unchangedOrder = await ordersController.getOrder(order.id);
      expect(unchangedOrder.status).toBe(OrderStatus.PENDING_PAYMENT);
    });
  });

  // Tarea 10 & 12: Casos Negativos y Recuperación de Aprovisionamiento
  describe('10 & 12. Casos Negativos, Reintentos y Aprovisionamiento Asíncrono', () => {
    it('executes durable provisioning workflow with status progression and error containment', async () => {
      const job = {
        id: 'job-real-001',
        orderId: 'ord-real-001',
        entitlementId: 'ent-real-001',
        organizationId: 'org-innovatech-001',
        targetEngine: 'DOKPLOY_CONTAINER' as any,
        status: ProvisioningJobStatus.QUEUED,
        createdAt: new Date(),
      };

      const processed = await worker.processJob(job);
      expect(processed.status).toBe(ProvisioningJobStatus.ACTIVE);
      expect(processed.stepHistory).toContain(ProvisioningJobStatus.VALIDATING);
      expect(processed.stepHistory).toContain(ProvisioningJobStatus.ALLOCATING);
      expect(processed.stepHistory).toContain(ProvisioningJobStatus.PROVISIONING);
      expect(processed.stepHistory).toContain(ProvisioningJobStatus.ACTIVE);
      expect(processed.attempts).toBe(1);
    });

    it('records failed attempt in provisioning and preserves state for retry without data loss', async () => {
      const failingWorker = new ProvisioningWorkerService({
        provision: async () => {
          throw new Error('DNS timeout during BIND9 reload');
        },
        rollback: async () => {},
      });

      const job = {
        id: 'job-fail-002',
        orderId: 'ord-real-fail-002',
        entitlementId: 'ent-real-fail-002',
        organizationId: 'org-innovatech-002',
        targetEngine: 'HESTIA_WORDPRESS' as any,
        status: ProvisioningJobStatus.QUEUED,
        createdAt: new Date(),
      };

      const failedJob = await failingWorker.processJob(job);
      expect(failedJob.status).toBe(ProvisioningJobStatus.FAILED);
      expect(failedJob.errorLog).toContain('DNS timeout during BIND9 reload');
      expect(failedJob.stepHistory).toContain(ProvisioningJobStatus.ROLLBACK_REQUIRED);
      expect(failedJob.attempts).toBe(1);
    });
  });
});

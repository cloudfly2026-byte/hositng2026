import { describe, it, expect, beforeEach } from 'vitest';
import { MeController } from './me.controller';
import {
  AccessPolicyService,
  SubscriptionService,
  ProductCatalogService,
  ProductCategory,
  BillingCycle,
  OrderService,
  OrderStatus,
} from '@cloudfly/domain';
import { Permissions } from '@cloudfly/contracts';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

describe('MeController — GET /me/capabilities (TDD)', () => {
  let catalog: ProductCatalogService;
  let accessPolicyService: AccessPolicyService;
  let subscriptionService: SubscriptionService;
  let orderService: OrderService;
  let controller: MeController;

  let hostingPlanVersionId: string;
  let appsPlanVersionId: string;

  beforeEach(() => {
    catalog = new ProductCatalogService();

    // 1. Hosting Plan
    const prodHosting = catalog.createProduct({
      name: 'Web Hosting Pro',
      code: 'prod-hosting',
      category: ProductCategory.WEB_HOSTING,
    });
    const planHosting = catalog.createPlan({
      productId: prodHosting.id,
      name: 'Plan Hosting Starter',
      code: 'plan-hosting-starter',
      infrastructureMode: 'SHARED',
    });
    const pvHosting = catalog.publishPlanVersion({
      planId: planHosting.id,
      version: 1,
      quotas: {
        cpuMilli: 1000,
        memoryMb: 1024,
        diskMb: 10240,
        bandwidthMb: 100000,
        maxApps: 1,
        maxDomains: 5,
        maxDatabases: 5,
        hermesAccess: false,
      },
      prices: [{ currency: 'COP', billingCycle: BillingCycle.MONTHLY, priceCents: 3500000 }],
      effectiveFrom: new Date('2026-01-01'),
    });
    hostingPlanVersionId = pvHosting.id;

    // 2. Cloud Apps Plan
    const prodApps = catalog.createProduct({
      name: 'Cloud Apps Container',
      code: 'prod-cloud-apps',
      category: ProductCategory.CLOUD_APPS,
    });
    const planApps = catalog.createPlan({
      productId: prodApps.id,
      name: 'Cloud Apps Runner',
      code: 'plan-apps-runner',
      infrastructureMode: 'SHARED',
    });
    const pvApps = catalog.publishPlanVersion({
      planId: planApps.id,
      version: 1,
      quotas: {
        cpuMilli: 2000,
        memoryMb: 4096,
        diskMb: 51200,
        bandwidthMb: 250000,
        maxApps: 10,
        maxDomains: 10,
        maxDatabases: 10,
        hermesAccess: true,
      },
      prices: [{ currency: 'COP', billingCycle: BillingCycle.MONTHLY, priceCents: 8500000 }],
      effectiveFrom: new Date('2026-01-01'),
    });
    appsPlanVersionId = pvApps.id;

    accessPolicyService = new AccessPolicyService(catalog);
    subscriptionService = new SubscriptionService();
    orderService = new OrderService(catalog);

    controller = new MeController(accessPolicyService, subscriptionService);
  });

  it('throws UnauthorizedException when request has no user session', async () => {
    await expect(controller.getCapabilities({ user: null })).rejects.toThrow(UnauthorizedException);
  });

  it('returns effective capabilities for an authenticated OWNER with active Web Hosting plan', async () => {
    // Seed active subscription for tenant-alpha
    const order = orderService.createOrder({
      organizationId: 'org-tenant-alpha',
      currency: 'COP',
      billingCycle: BillingCycle.MONTHLY,
      items: [{ planVersionId: hostingPlanVersionId, quantity: 1 }],
      idempotencyKey: 'idem-test-me-1',
    });
    order.status = OrderStatus.PAID;
    subscriptionService.createSubscriptionFromPaidOrder(order);

    const req = {
      user: {
        userId: 'usr-owner-1',
        email: 'owner@alpha.com',
        organizationId: 'org-tenant-alpha',
        roles: ['OWNER'],
        isOperator: false,
      },
    };

    const caps = await controller.getCapabilities(req);

    expect(caps.role).toBe('OWNER');
    expect(caps.organization.id).toBe('org-tenant-alpha');
    expect(caps.permissions).toContain(Permissions.HOSTING_MANAGE);
    expect(caps.permissions).toContain(Permissions.BILLING_MANAGE);
    expect(caps.visibleModules).toContain('hosting');
    expect(caps.visibleModules).toContain('billing');
    expect(caps.servicesStatus.hasActivePlan).toBe(true);
    expect(caps.servicesStatus.subscriptionStatus).toBe('ACTIVE');
  });

  it('returns effective capabilities for a DEVELOPER with Cloud Apps plan', async () => {
    const order = orderService.createOrder({
      organizationId: 'org-tenant-beta',
      currency: 'COP',
      billingCycle: BillingCycle.MONTHLY,
      items: [{ planVersionId: appsPlanVersionId, quantity: 1 }],
      idempotencyKey: 'idem-test-me-2',
    });
    order.status = OrderStatus.PAID;
    subscriptionService.createSubscriptionFromPaidOrder(order);

    const req = {
      user: {
        userId: 'usr-dev-1',
        email: 'dev@beta.com',
        organizationId: 'org-tenant-beta',
        roles: ['DEVELOPER'],
        isOperator: false,
      },
    };

    const caps = await controller.getCapabilities(req);

    expect(caps.role).toBe('DEVELOPER');
    expect(caps.permissions).toContain(Permissions.APPS_READ);
    expect(caps.permissions).toContain(Permissions.APPS_DEPLOY);
    expect(caps.permissions).not.toContain(Permissions.BILLING_MANAGE);
    expect(caps.visibleModules).toContain('apps');
    expect(caps.visibleModules).not.toContain('billing');
  });

  it('rejects cross-tenant capability query with ForbiddenException', async () => {
    const req = {
      user: {
        userId: 'usr-attacker',
        email: 'attacker@corp.com',
        organizationId: 'org-tenant-alpha',
        roles: ['OWNER'],
        isOperator: false,
      },
    };

    // User from Alpha tries to query Beta's capabilities
    await expect(controller.getCapabilities(req, 'org-tenant-beta')).rejects.toThrow(ForbiddenException);
  });

  it('returns platform operator capabilities for an authenticated operator', async () => {
    const req = {
      user: {
        userId: 'usr-operator-1',
        email: 'ops@velupi.com',
        organizationId: 'org-velupi-internal',
        roles: ['SUPER_ADMIN'],
        isOperator: true,
      },
    };

    const caps = await controller.getCapabilities(req);

    expect(caps.isOperator).toBe(true);
    expect(caps.permissions).toContain(Permissions.PLATFORM_NODES_MANAGE);
    expect(caps.permissions).toContain(Permissions.PLATFORM_QUEUES_MANAGE);
  });

  it('returns empty operational capabilities when tenant has NO active subscription', async () => {
    const req = {
      user: {
        userId: 'usr-free-1',
        email: 'free@empty.com',
        organizationId: 'org-empty-tenant',
        roles: ['OWNER'],
        isOperator: false,
      },
    };

    const caps = await controller.getCapabilities(req);

    expect(caps.servicesStatus.hasActivePlan).toBe(false);
    expect(caps.visibleModules).not.toContain('hosting');
    expect(caps.visibleModules).not.toContain('apps');
    expect(caps.visibleModules).toContain('billing');
  });

  it('reflects SUSPENDED status and revokes mutating operations', async () => {
    const order = orderService.createOrder({
      organizationId: 'org-suspended-tenant',
      currency: 'COP',
      billingCycle: BillingCycle.MONTHLY,
      items: [{ planVersionId: hostingPlanVersionId, quantity: 1 }],
      idempotencyKey: 'idem-test-me-suspended',
    });
    order.status = OrderStatus.PAID;
    const sub = subscriptionService.createSubscriptionFromPaidOrder(order);

    // Manually suspend subscription
    sub.status = 'SUSPENDED';

    const req = {
      user: {
        userId: 'usr-suspended',
        email: 'suspended@tenant.com',
        organizationId: 'org-suspended-tenant',
        roles: ['OWNER'],
        isOperator: false,
      },
    };

    const caps = await controller.getCapabilities(req);

    expect(caps.servicesStatus.suspended).toBe(true);
    expect(caps.permissions).not.toContain(Permissions.HOSTING_MANAGE);
    expect(caps.permissions).toContain(Permissions.HOSTING_READ);
    expect(caps.permissions).toContain(Permissions.BILLING_MANAGE);
  });

  it('fetches authoritative membership role from backend service, ignoring stale client token roles', async () => {
    // Security Rule 6, 12 & 13: Endpoints do NOT trust roles sent from client; authoritative membership wins
    const mockAuthService = {
      getMembership: async (userId: string, orgId: string) => {
        if (userId === 'usr-demoted' && orgId === 'org-tenant-alpha') {
          return { id: 'mem-1', userId, organizationId: orgId, role: 'VIEWER' as const };
        }
        return null;
      },
    };

    const controllerWithAuth = new MeController(
      accessPolicyService,
      subscriptionService,
      mockAuthService as any
    );

    const req = {
      user: {
        userId: 'usr-demoted',
        email: 'demoted@corp.com',
        organizationId: 'org-tenant-alpha',
        roles: ['OWNER'], // Stale client token says OWNER!
        isOperator: false,
      },
    };

    const caps = await controllerWithAuth.getCapabilities(req, 'org-tenant-alpha');
    // Real role from membership is VIEWER, so OWNER permissions must NOT be granted
    expect(caps.role).toBe('VIEWER');
    expect(caps.permissions).not.toContain(Permissions.HOSTING_MANAGE);
    expect(caps.permissions).not.toContain(Permissions.BILLING_MANAGE);
  });

  it('rejects capability query with ForbiddenException when membership was revoked', async () => {
    const mockAuthService = {
      getMembership: async () => null, // Membership revoked or non-existent
    };

    const controllerWithAuth = new MeController(
      accessPolicyService,
      subscriptionService,
      mockAuthService as any
    );

    const req = {
      user: {
        userId: 'usr-kicked-out',
        email: 'revoked@corp.com',
        organizationId: 'org-tenant-alpha',
        roles: ['DEVELOPER'],
        isOperator: false,
      },
    };

    await expect(
      controllerWithAuth.getCapabilities(req, 'org-tenant-alpha-different')
    ).rejects.toThrow(ForbiddenException);
  });
});

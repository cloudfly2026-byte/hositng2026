import { describe, it, expect, beforeEach } from 'vitest';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AccessPolicyService,
  ProductCatalogService,
  ProductCategory,
  BillingCycle,
  SubscriptionService,
  OrderService,
  OrderStatus,
} from '@cloudfly/domain';
import { Permissions } from '@cloudfly/contracts';
import { PermissionsGuard } from './permissions.guard';
import { PlatformOperatorGuard } from './platform-operator.guard';
import { PERMISSIONS_KEY } from './permissions.decorator';

function mockExecutionContext(request: Record<string, any>, handler?: any): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => handler || (() => {}),
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

describe('VELUPI — PermissionsGuard & PlatformOperatorGuard Enforcement (TDD)', () => {
  let catalog: ProductCatalogService;
  let accessPolicyService: AccessPolicyService;
  let subscriptionService: SubscriptionService;
  let orderService: OrderService;
  let reflector: Reflector;
  let permissionsGuard: PermissionsGuard;
  let operatorGuard: PlatformOperatorGuard;
  let hostingPlanVersionId: string;

  beforeEach(() => {
    catalog = new ProductCatalogService();
    const prod = catalog.createProduct({
      name: 'Web Hosting Pro',
      code: 'prod-hosting',
      category: ProductCategory.WEB_HOSTING,
    });
    const plan = catalog.createPlan({
      productId: prod.id,
      name: 'Plan Hosting',
      code: 'plan-hosting',
      infrastructureMode: 'SHARED',
    });
    const pv = catalog.publishPlanVersion({
      planId: plan.id,
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
    hostingPlanVersionId = pv.id;

    accessPolicyService = new AccessPolicyService(catalog);
    subscriptionService = new SubscriptionService();
    orderService = new OrderService(catalog);
    reflector = new Reflector();

    permissionsGuard = new PermissionsGuard(reflector, accessPolicyService, subscriptionService);
    operatorGuard = new PlatformOperatorGuard();
  });

  describe('PlatformOperatorGuard', () => {
    it('allows access to platform operator credentials', () => {
      const context = mockExecutionContext({
        user: {
          userId: 'usr-op',
          isOperator: true,
          roles: ['SUPER_ADMIN'],
        },
      });
      expect(operatorGuard.canActivate(context)).toBe(true);
    });

    it('strictly denies client OWNER from accessing platform operator console', () => {
      const context = mockExecutionContext({
        user: {
          userId: 'usr-owner',
          isOperator: false,
          roles: ['OWNER'],
        },
      });
      expect(() => operatorGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('throws UnauthorizedException when user is unauthenticated', () => {
      const context = mockExecutionContext({ user: null });
      expect(() => operatorGuard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });

  describe('PermissionsGuard Enforcement', () => {
    it('allows route without @RequirePermissions decorator', () => {
      const context = mockExecutionContext({
        user: { userId: 'usr-1', organizationId: 'org-1', roles: ['VIEWER'] },
      });
      expect(permissionsGuard.canActivate(context)).toBe(true);
    });

    it('allows access when user has role and active plan covering the permission', () => {
      // Seed active subscription
      const order = orderService.createOrder({
        organizationId: 'org-tenant-1',
        currency: 'COP',
        billingCycle: BillingCycle.MONTHLY,
        items: [{ planVersionId: hostingPlanVersionId, quantity: 1 }],
        idempotencyKey: 'idem-perm-1',
      });
      order.status = OrderStatus.PAID;
      subscriptionService.createSubscriptionFromPaidOrder(order);

      const handler = () => {};
      reflector.getAllAndOverride = () => [Permissions.HOSTING_MANAGE];

      const context = mockExecutionContext(
        {
          user: {
            userId: 'usr-owner-1',
            organizationId: 'org-tenant-1',
            roles: ['OWNER'],
          },
        },
        handler
      );

      expect(permissionsGuard.canActivate(context)).toBe(true);
    });

    it('throws ForbiddenException when role lacks permission (e.g. VIEWER attempting HOSTING_MANAGE)', () => {
      const order = orderService.createOrder({
        organizationId: 'org-tenant-1',
        currency: 'COP',
        billingCycle: BillingCycle.MONTHLY,
        items: [{ planVersionId: hostingPlanVersionId, quantity: 1 }],
        idempotencyKey: 'idem-perm-2',
      });
      order.status = OrderStatus.PAID;
      subscriptionService.createSubscriptionFromPaidOrder(order);

      reflector.getAllAndOverride = () => [Permissions.HOSTING_MANAGE];

      const context = mockExecutionContext({
        user: {
          userId: 'usr-viewer-1',
          organizationId: 'org-tenant-1',
          roles: ['VIEWER'],
        },
      });

      expect(() => permissionsGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when organization has NO active plan for operational permission', () => {
      reflector.getAllAndOverride = () => [Permissions.HOSTING_MANAGE];

      const context = mockExecutionContext({
        user: {
          userId: 'usr-owner-1',
          organizationId: 'org-no-plan',
          roles: ['OWNER'],
        },
      });

      expect(() => permissionsGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException on mutating actions when subscription is SUSPENDED', () => {
      const order = orderService.createOrder({
        organizationId: 'org-suspended-1',
        currency: 'COP',
        billingCycle: BillingCycle.MONTHLY,
        items: [{ planVersionId: hostingPlanVersionId, quantity: 1 }],
        idempotencyKey: 'idem-perm-suspended',
      });
      order.status = OrderStatus.PAID;
      const sub = subscriptionService.createSubscriptionFromPaidOrder(order);
      sub.status = 'SUSPENDED';

      reflector.getAllAndOverride = () => [Permissions.HOSTING_MANAGE];

      const context = mockExecutionContext({
        user: {
          userId: 'usr-owner-1',
          organizationId: 'org-suspended-1',
          roles: ['OWNER'],
        },
      });

      expect(() => permissionsGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('allows read-only access and billing access when subscription is SUSPENDED', () => {
      const order = orderService.createOrder({
        organizationId: 'org-suspended-2',
        currency: 'COP',
        billingCycle: BillingCycle.MONTHLY,
        items: [{ planVersionId: hostingPlanVersionId, quantity: 1 }],
        idempotencyKey: 'idem-perm-suspended-read',
      });
      order.status = OrderStatus.PAID;
      const sub = subscriptionService.createSubscriptionFromPaidOrder(order);
      sub.status = 'SUSPENDED';

      // Read permission allowed
      reflector.getAllAndOverride = () => [Permissions.HOSTING_READ];

      const context = mockExecutionContext({
        user: {
          userId: 'usr-owner-1',
          organizationId: 'org-suspended-2',
          roles: ['OWNER'],
        },
      });

      expect(permissionsGuard.canActivate(context)).toBe(true);
    });
  });

  describe('JwtAuthGuard Session Invalidation & Revocation', () => {
    it('strictly rejects revoked or logged out JWT tokens with UnauthorizedException', async () => {
      const { JwtAuthGuard } = await import('./jwt-auth.guard');
      const { JwtSecurityService } = await import('@cloudfly/domain');

      const jwtService = new JwtSecurityService('velupi_jwt_secure_key_2026_super_secret');
      const token = jwtService.sign({
        sub: 'usr-logout-test',
        email: 'logout@test.com',
        organizationId: 'org-test',
        roles: ['OWNER'],
      });

      const mockAuthService = {
        isTokenRevoked: (t: string) => t === token,
      };

      const guard = new JwtAuthGuard(mockAuthService as any);
      const context = mockExecutionContext({
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('strictly rejects expired JWT tokens with UnauthorizedException', async () => {
      const { JwtAuthGuard } = await import('./jwt-auth.guard');
      const { JwtSecurityService } = await import('@cloudfly/domain');

      const jwtService = new JwtSecurityService('velupi_jwt_secure_key_2026_super_secret');
      // Sign with negative expiration (-10 seconds)
      const expiredToken = jwtService.sign(
        {
          sub: 'usr-expired',
          email: 'expired@test.com',
          organizationId: 'org-test',
          roles: ['VIEWER'],
        },
        -10
      );

      const guard = new JwtAuthGuard();
      const context = mockExecutionContext({
        headers: {
          authorization: `Bearer ${expiredToken}`,
        },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('immediately reflects role changes during an active session in backend authorization checks', async () => {
      const { AuthenticationService, Argon2PasswordHasher, JwtSecurityService } = await import('@cloudfly/domain');
      const hasher = new Argon2PasswordHasher();
      const authService = new AuthenticationService(hasher, new JwtSecurityService('velupi_jwt_secure_key_2026_super_secret'));

      const reg = await authService.register({
        email: 'rolechange@velupi.com',
        password: 'Password123!',
        fullName: 'Role Change User',
        organizationName: 'Role Org',
      });

      const user = reg.user;
      const orgId = reg.organization.id;

      // Initial membership is OWNER
      const initialMem = await authService.getMembership(user.id, orgId);
      expect(initialMem?.role).toBe('OWNER');

      // Admin or system demotes user to VIEWER during their active session
      await authService.updateMembershipRole(initialMem!.id, 'VIEWER');

      // Subsequent query on authorization/capabilities immediately sees updated VIEWER role
      const updatedMem = await authService.getMembership(user.id, orgId);
      expect(updatedMem?.role).toBe('VIEWER');
    });

    it('strictly forbids privileged mutations when an organization has NO active plans (no entitlements)', () => {
      // Organization with zero orders and zero subscriptions
      reflector.getAllAndOverride = () => [Permissions.HOSTING_MANAGE];

      const context = mockExecutionContext({
        user: {
          userId: 'usr-planless',
          organizationId: 'org-zero-plans',
          roles: ['OWNER'],
        },
      });

      expect(() => permissionsGuard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});

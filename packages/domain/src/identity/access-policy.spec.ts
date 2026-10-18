import { describe, it, expect, beforeEach } from 'vitest';
import {
  AccessPolicyService,
  CAPABILITIES_CATALOG_VERSION,
} from './access-policy';
import { Permissions, Role, OrganizationRole, PlatformRole } from '@cloudfly/contracts';
import { ProductCategory, BillingCycle, ProductCatalogService } from '../commerce/catalog';

describe('VELUPI — AccessPolicyService (RBAC Multinivel + Entitlements + Capacidades Dinámicas)', () => {
  let policyService: AccessPolicyService;
  let catalog: ProductCatalogService;

  beforeEach(() => {
    catalog = new ProductCatalogService();

    // 1. Web Hosting Product & Plan
    const prodHosting = catalog.createProduct({
      name: 'Web Hosting Pro',
      code: 'prod-hosting',
      category: ProductCategory.WEB_HOSTING,
    });
    const planHosting = catalog.createPlan({
      productId: prodHosting.id,
      name: 'Plan Hosting Emprendedor',
      code: 'plan-hosting-starter',
      infrastructureMode: 'SHARED',
    });
    catalog.publishPlanVersion({
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

    // 2. Cloud Apps Product & Plan
    const prodApps = catalog.createProduct({
      name: 'Cloud Apps Container',
      code: 'prod-cloud-apps',
      category: ProductCategory.CLOUD_APPS,
    });
    const planApps = catalog.createPlan({
      productId: prodApps.id,
      name: 'Node & Docker Runner',
      code: 'plan-apps-runner',
      infrastructureMode: 'SHARED',
    });
    catalog.publishPlanVersion({
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

    // 3. Microservices Studio Pro Plan
    const prodStudio = catalog.createProduct({
      name: 'Microservices Studio Pro',
      code: 'prod-studio',
      category: ProductCategory.MICROSERVICES,
    });
    const planStudio = catalog.createPlan({
      productId: prodStudio.id,
      name: 'Microservices Architect Plan',
      code: 'plan-studio-pro',
      infrastructureMode: 'DEDICATED',
    });
    catalog.publishPlanVersion({
      planId: planStudio.id,
      version: 1,
      quotas: {
        cpuMilli: 4000,
        memoryMb: 8192,
        diskMb: 102400,
        bandwidthMb: 500000,
        maxApps: 25,
        maxDomains: 25,
        maxDatabases: 25,
        hermesAccess: true,
      },
      prices: [{ currency: 'COP', billingCycle: BillingCycle.MONTHLY, priceCents: 15000000 }],
      effectiveFrom: new Date('2026-01-01'),
    });

    policyService = new AccessPolicyService(catalog);
  });

  describe('Versioned Catalog', () => {
    it('provides a versioned catalog identifier', () => {
      expect(policyService.getCatalogVersion()).toBe(CAPABILITIES_CATALOG_VERSION);
    });
  });

  describe('Tenant Role Matrix & Permissions Isolation', () => {
    const org = { id: 'org-tenant-1', name: 'Acme Corp', slug: 'acme-corp', isInternalPilot: false };

    it('OWNER: receives full management of tenant resources, billing, and members when plan is active', () => {
      const caps = policyService.getEffectiveCapabilities({
        userId: 'usr-owner',
        organization: org,
        role: 'OWNER',
        subscriptions: [{ status: 'ACTIVE', planCode: 'plan-hosting-starter', planCategory: 'WEB_HOSTING' }],
      });

      expect(caps.role).toBe('OWNER');
      expect(caps.permissions).toContain(Permissions.HOSTING_MANAGE);
      expect(caps.permissions).toContain(Permissions.DNS_MANAGE);
      expect(caps.permissions).toContain(Permissions.DATABASES_MANAGE);
      expect(caps.permissions).toContain(Permissions.BILLING_MANAGE);
      expect(caps.permissions).toContain(Permissions.BILLING_READ);
      expect(caps.permissions).toContain(Permissions.MEMBERS_MANAGE);
      expect(caps.visibleModules).toContain('hosting');
      expect(caps.visibleModules).toContain('billing');
      expect(caps.visibleModules).toContain('account');
    });

    it('ADMIN: manages technical resources and members, but NO billing permissions by default', () => {
      const caps = policyService.getEffectiveCapabilities({
        userId: 'usr-admin',
        organization: org,
        role: 'ADMIN',
        subscriptions: [{ status: 'ACTIVE', planCode: 'plan-hosting-starter', planCategory: 'WEB_HOSTING' }],
      });

      expect(caps.role).toBe('ADMIN');
      expect(caps.permissions).toContain(Permissions.HOSTING_MANAGE);
      expect(caps.permissions).toContain(Permissions.MEMBERS_MANAGE);
      expect(caps.permissions).not.toContain(Permissions.BILLING_MANAGE);
      expect(caps.permissions).not.toContain(Permissions.BILLING_READ);
      expect(caps.visibleModules).not.toContain('billing');
      expect(caps.visibleModules).toContain('hosting');
    });

    it('DEVELOPER: manages technical resources, but NO members management and NO billing', () => {
      const caps = policyService.getEffectiveCapabilities({
        userId: 'usr-dev',
        organization: org,
        role: 'DEVELOPER',
        subscriptions: [{ status: 'ACTIVE', planCode: 'plan-hosting-starter', planCategory: 'WEB_HOSTING' }],
      });

      expect(caps.role).toBe('DEVELOPER');
      expect(caps.permissions).toContain(Permissions.HOSTING_MANAGE);
      expect(caps.permissions).toContain(Permissions.DATABASES_MANAGE);
      expect(caps.permissions).not.toContain(Permissions.MEMBERS_MANAGE);
      expect(caps.permissions).not.toContain(Permissions.BILLING_READ);
      expect(caps.permissions).not.toContain(Permissions.BILLING_MANAGE);
      expect(caps.visibleModules).not.toContain('billing');
    });

    it('VIEWER: only read-only access to authorized resources, no deploy or mutate actions', () => {
      const caps = policyService.getEffectiveCapabilities({
        userId: 'usr-viewer',
        organization: org,
        role: 'VIEWER',
        subscriptions: [{ status: 'ACTIVE', planCode: 'plan-hosting-starter', planCategory: 'WEB_HOSTING' }],
      });

      expect(caps.role).toBe('VIEWER');
      expect(caps.permissions).toContain(Permissions.HOSTING_READ);
      expect(caps.permissions).toContain(Permissions.DNS_READ);
      expect(caps.permissions).not.toContain(Permissions.HOSTING_MANAGE);
      expect(caps.permissions).not.toContain(Permissions.APPS_DEPLOY);
      expect(caps.permissions).not.toContain(Permissions.DATABASES_MANAGE);
      expect(caps.permissions).not.toContain(Permissions.MEMBERS_MANAGE);
      expect(caps.permissions).not.toContain(Permissions.BILLING_MANAGE);
    });

    it('Strict Separation: customer OWNER NEVER gets platform administrator permissions', () => {
      const caps = policyService.getEffectiveCapabilities({
        userId: 'usr-owner',
        organization: org,
        role: 'OWNER',
        subscriptions: [{ status: 'ACTIVE', planCode: 'plan-hosting-starter', planCategory: 'WEB_HOSTING' }],
      });

      expect(caps.permissions).not.toContain(Permissions.PLATFORM_NODES_MANAGE);
      expect(caps.permissions).not.toContain(Permissions.PLATFORM_QUEUES_MANAGE);
      expect(caps.permissions).not.toContain(Permissions.PLATFORM_CONFIG_MANAGE);
      expect(caps.permissions).not.toContain(Permissions.PLATFORM_TENANTS_MANAGE);
      expect(caps.isOperator).toBe(false);

      const decision = policyService.evaluateAccess({
        userId: 'usr-owner',
        organizationId: org.id,
        membership: { role: 'OWNER', organizationId: org.id },
        permission: Permissions.PLATFORM_NODES_MANAGE,
      });
      expect(decision.granted).toBe(false);
      expect(decision.reason).toContain('Platform permissions');
    });

    it('Platform Roles: SUPER_ADMIN, OPERATOR, SUPPORT operate in dedicated platform context', () => {
      const superAdminCaps = policyService.getEffectiveCapabilities({
        userId: 'usr-super',
        organization: { id: 'org-velupi-internal', name: 'Platform Ops', slug: 'ops', isInternalPilot: true },
        role: 'SUPER_ADMIN',
        isOperator: true,
      });

      expect(superAdminCaps.isOperator).toBe(true);
      expect(superAdminCaps.permissions).toContain(Permissions.PLATFORM_NODES_MANAGE);
      expect(superAdminCaps.permissions).toContain(Permissions.PLATFORM_QUEUES_MANAGE);
      expect(superAdminCaps.permissions).toContain(Permissions.PLATFORM_OPERATORS_MANAGE);

      const operatorCaps = policyService.getEffectiveCapabilities({
        userId: 'usr-op',
        organization: { id: 'org-velupi-internal', name: 'Platform Ops', slug: 'ops', isInternalPilot: true },
        role: 'OPERATOR',
        isOperator: true,
      });

      expect(operatorCaps.permissions).toContain(Permissions.PLATFORM_NODES_MANAGE);
      expect(operatorCaps.permissions).not.toContain(Permissions.PLATFORM_OPERATORS_MANAGE);

      const supportCaps = policyService.getEffectiveCapabilities({
        userId: 'usr-supp',
        organization: { id: 'org-velupi-internal', name: 'Platform Ops', slug: 'ops', isInternalPilot: true },
        role: 'SUPPORT',
        isOperator: true,
      });

      expect(supportCaps.permissions).toContain(Permissions.PLATFORM_TENANTS_READ);
      expect(supportCaps.permissions).not.toContain(Permissions.PLATFORM_NODES_MANAGE);
    });
  });

  describe('Plans, Entitlements & Visible Modules', () => {
    const org = { id: 'org-tenant-2', name: 'Beta Tech', slug: 'beta-tech', isInternalPilot: false };

    it('Tenant without active plan has NO operational modules enabled (only billing/checkout/account)', () => {
      const caps = policyService.getEffectiveCapabilities({
        userId: 'usr-1',
        organization: org,
        role: 'OWNER',
        subscriptions: [], // No subscriptions
      });

      expect(caps.servicesStatus.hasActivePlan).toBe(false);
      expect(caps.contractedCapabilities).toHaveLength(0);
      expect(caps.visibleModules).not.toContain('hosting');
      expect(caps.visibleModules).not.toContain('apps');
      expect(caps.visibleModules).not.toContain('databases');
      expect(caps.visibleModules).not.toContain('studio');
      expect(caps.visibleModules).toContain('billing');
      expect(caps.visibleModules).toContain('account');

      // Attempting operational action is denied
      const decision = policyService.evaluateAccess({
        userId: 'usr-1',
        organizationId: org.id,
        membership: { role: 'OWNER', organizationId: org.id },
        permission: Permissions.HOSTING_MANAGE,
        subscriptions: [],
      });
      expect(decision.granted).toBe(false);
      expect(decision.reason).toContain('No active plan');
    });

    it('Web Hosting Plan: grants hosting, dns, databases, files, emails, ssl; denies apps & studio', () => {
      const caps = policyService.getEffectiveCapabilities({
        userId: 'usr-1',
        organization: org,
        role: 'OWNER',
        subscriptions: [{ status: 'ACTIVE', planCode: 'plan-hosting-starter', planCategory: 'WEB_HOSTING' }],
      });

      expect(caps.contractedCapabilities).toContain('web_hosting');
      expect(caps.contractedCapabilities).toContain('databases');
      expect(caps.contractedCapabilities).toContain('dns');
      expect(caps.contractedCapabilities).not.toContain('cloud_apps');
      expect(caps.contractedCapabilities).not.toContain('microservices_studio');

      expect(caps.visibleModules).toContain('hosting');
      expect(caps.visibleModules).toContain('files');
      expect(caps.visibleModules).toContain('databases');
      expect(caps.visibleModules).toContain('emails');
      expect(caps.visibleModules).toContain('dns');
      expect(caps.visibleModules).toContain('ssl');
      expect(caps.visibleModules).toContain('backups');
      expect(caps.visibleModules).not.toContain('apps');
      expect(caps.visibleModules).not.toContain('studio');
      expect(caps.visibleModules).not.toContain('gateway');
    });

    it('Cloud Apps Plan: grants apps, gateway, dns; denies hosting & emails', () => {
      const caps = policyService.getEffectiveCapabilities({
        userId: 'usr-1',
        organization: org,
        role: 'OWNER',
        subscriptions: [{ status: 'ACTIVE', planCode: 'plan-apps-runner', planCategory: 'CLOUD_APPS' }],
      });

      expect(caps.contractedCapabilities).toContain('cloud_apps');
      expect(caps.contractedCapabilities).toContain('gateway');
      expect(caps.contractedCapabilities).not.toContain('web_hosting');

      expect(caps.visibleModules).toContain('apps');
      expect(caps.visibleModules).toContain('gateway');
      expect(caps.visibleModules).toContain('dns');
      expect(caps.visibleModules).not.toContain('hosting');
      expect(caps.visibleModules).not.toContain('emails');
    });

    it('Microservices Studio Pro Plan: grants studio, apps, gateway, databases, dns', () => {
      const caps = policyService.getEffectiveCapabilities({
        userId: 'usr-1',
        organization: org,
        role: 'OWNER',
        subscriptions: [{ status: 'ACTIVE', planCode: 'plan-studio-pro', planCategory: 'MICROSERVICES' }],
      });

      expect(caps.contractedCapabilities).toContain('microservices_studio');
      expect(caps.contractedCapabilities).toContain('cloud_apps');
      expect(caps.visibleModules).toContain('studio');
      expect(caps.visibleModules).toContain('apps');
      expect(caps.visibleModules).toContain('gateway');
      expect(caps.visibleModules).toContain('databases');
    });

    it('Multiple Plans: Merges capabilities across plans (Hosting + Cloud Apps)', () => {
      const caps = policyService.getEffectiveCapabilities({
        userId: 'usr-1',
        organization: org,
        role: 'OWNER',
        subscriptions: [
          { status: 'ACTIVE', planCode: 'plan-hosting-starter', planCategory: 'WEB_HOSTING' },
          { status: 'ACTIVE', planCode: 'plan-apps-runner', planCategory: 'CLOUD_APPS' },
        ],
      });

      expect(caps.contractedCapabilities).toContain('web_hosting');
      expect(caps.contractedCapabilities).toContain('cloud_apps');
      expect(caps.visibleModules).toContain('hosting');
      expect(caps.visibleModules).toContain('apps');
      expect(caps.visibleModules).toContain('databases');
      expect(caps.visibleModules).toContain('dns');
      expect(caps.visibleModules).toContain('gateway');
    });
  });

  describe('Lifecycle & Subscription States Enforcement', () => {
    const org = { id: 'org-tenant-3', name: 'Gamma Corp', slug: 'gamma-corp', isInternalPilot: false };

    it('GRACE_PERIOD: allows operational access while flagging grace period warning in servicesStatus', () => {
      const caps = policyService.getEffectiveCapabilities({
        userId: 'usr-1',
        organization: org,
        role: 'OWNER',
        subscriptions: [{ status: 'GRACE_PERIOD', planCode: 'plan-hosting-starter', planCategory: 'WEB_HOSTING' }],
      });

      expect(caps.servicesStatus.gracePeriod).toBe(true);
      expect(caps.servicesStatus.hasActivePlan).toBe(true);
      expect(caps.permissions).toContain(Permissions.HOSTING_MANAGE);

      const decision = policyService.evaluateAccess({
        userId: 'usr-1',
        organizationId: org.id,
        membership: { role: 'OWNER', organizationId: org.id },
        permission: Permissions.HOSTING_MANAGE,
        subscriptions: [{ status: 'GRACE_PERIOD', planCode: 'plan-hosting-starter' }],
      });
      expect(decision.granted).toBe(true);
    });

    it('SUSPENDED: revokes mutating operations (deploy, manage, create DB), but preserves billing and read-only recovery access', () => {
      const caps = policyService.getEffectiveCapabilities({
        userId: 'usr-1',
        organization: org,
        role: 'OWNER',
        subscriptions: [{ status: 'SUSPENDED', planCode: 'plan-hosting-starter', planCategory: 'WEB_HOSTING' }],
      });

      expect(caps.servicesStatus.suspended).toBe(true);
      // Mutating operations revoked
      expect(caps.permissions).not.toContain(Permissions.HOSTING_MANAGE);
      expect(caps.permissions).not.toContain(Permissions.DATABASES_MANAGE);
      expect(caps.permissions).not.toContain(Permissions.APPS_DEPLOY);

      // Read-only and billing preserved for payment & renewal
      expect(caps.permissions).toContain(Permissions.HOSTING_READ);
      expect(caps.permissions).toContain(Permissions.BILLING_READ);
      expect(caps.permissions).toContain(Permissions.BILLING_MANAGE);

      // Direct assert checks
      const deployDecision = policyService.evaluateAccess({
        userId: 'usr-1',
        organizationId: org.id,
        membership: { role: 'OWNER', organizationId: org.id },
        permission: Permissions.HOSTING_MANAGE,
        subscriptions: [{ status: 'SUSPENDED', planCode: 'plan-hosting-starter' }],
      });
      expect(deployDecision.granted).toBe(false);
      expect(deployDecision.reason).toContain('Subscription is suspended');

      const billingDecision = policyService.evaluateAccess({
        userId: 'usr-1',
        organizationId: org.id,
        membership: { role: 'OWNER', organizationId: org.id },
        permission: Permissions.BILLING_MANAGE,
        subscriptions: [{ status: 'SUSPENDED', planCode: 'plan-hosting-starter' }],
      });
      expect(billingDecision.granted).toBe(true);
    });

    it('CANCELLED / EXPIRED: revokes all operational access, allowing only billing consultation', () => {
      const decision = policyService.evaluateAccess({
        userId: 'usr-1',
        organizationId: org.id,
        membership: { role: 'OWNER', organizationId: org.id },
        permission: Permissions.HOSTING_READ,
        subscriptions: [{ status: 'CANCELLED', planCode: 'plan-hosting-starter' }],
      });
      expect(decision.granted).toBe(false);
      expect(decision.reason).toContain('Subscription is cancelled');
    });
  });

  describe('Multi-Tenant Isolation & Organization Switching', () => {
    const orgA = { id: 'org-a', name: 'Org Alpha', slug: 'org-alpha', isInternalPilot: false };
    const orgB = { id: 'org-b', name: 'Org Beta', slug: 'org-beta', isInternalPilot: false };

    it('evaluates different roles and plans dynamically when user switches active organization', () => {
      // User is OWNER in Org A (which has Web Hosting)
      const capsA = policyService.getEffectiveCapabilities({
        userId: 'usr-switch',
        organization: orgA,
        role: 'OWNER',
        subscriptions: [{ status: 'ACTIVE', planCode: 'plan-hosting-starter', planCategory: 'WEB_HOSTING' }],
      });
      expect(capsA.organization.id).toBe('org-a');
      expect(capsA.role).toBe('OWNER');
      expect(capsA.permissions).toContain(Permissions.BILLING_MANAGE);
      expect(capsA.visibleModules).toContain('hosting');
      expect(capsA.visibleModules).not.toContain('apps');

      // Same user is VIEWER in Org B (which has Cloud Apps)
      const capsB = policyService.getEffectiveCapabilities({
        userId: 'usr-switch',
        organization: orgB,
        role: 'VIEWER',
        subscriptions: [{ status: 'ACTIVE', planCode: 'plan-apps-runner', planCategory: 'CLOUD_APPS' }],
      });
      expect(capsB.organization.id).toBe('org-b');
      expect(capsB.role).toBe('VIEWER');
      expect(capsB.permissions).not.toContain(Permissions.BILLING_MANAGE);
      expect(capsB.permissions).toContain(Permissions.APPS_READ);
      expect(capsB.permissions).not.toContain(Permissions.APPS_DEPLOY);
      expect(capsB.visibleModules).toContain('apps');
      expect(capsB.visibleModules).not.toContain('hosting');
    });

    it('Rejects cross-tenant access when targetResource belongs to another tenant', () => {
      const decision = policyService.evaluateAccess({
        userId: 'usr-1',
        organizationId: 'org-a',
        membership: { role: 'OWNER', organizationId: 'org-a' },
        permission: Permissions.HOSTING_READ,
        targetResource: {
          organizationId: 'org-b', // Cross tenant!
        },
        subscriptions: [{ status: 'ACTIVE', planCode: 'plan-hosting-starter' }],
      });

      expect(decision.granted).toBe(false);
      expect(decision.reason).toContain('Cross-tenant access forbidden');
    });

    it('Rejects request if membership organization does not match active context organization', () => {
      const decision = policyService.evaluateAccess({
        userId: 'usr-1',
        organizationId: 'org-a',
        membership: { role: 'OWNER', organizationId: 'org-mismatch' },
        permission: Permissions.HOSTING_READ,
      });

      expect(decision.granted).toBe(false);
      expect(decision.reason).toContain('Membership organization mismatch');
    });
  });
});

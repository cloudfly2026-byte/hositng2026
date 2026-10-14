import { describe, it, expect, beforeEach } from 'vitest';
import { DashboardController } from './dashboard.controller';
import {
  HostingManagementService,
  DnsManagerService,
  CloudAppsService,
  SubscriptionService,
  OrderService,
  ProductCatalogService,
  ProductCategory,
  BillingCycle,
  OrderStatus,
} from '@cloudfly/domain';
import { AuthorizedContext } from '@cloudfly/contracts';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

describe('DashboardController (Real Dashboard Metrics & Service Summary)', () => {
  let controller: DashboardController;
  let hostingService: HostingManagementService;
  let dnsManager: DnsManagerService;
  let cloudAppsService: CloudAppsService;
  let subscriptionService: SubscriptionService;
  let orderService: OrderService;
  let catalog: ProductCatalogService;

  const tenantAContext: AuthorizedContext = {
    userId: 'usr-1',
    organizationId: 'org-tenant-a',
    roles: ['OWNER'],
    permissions: ['*'],
  };

  const tenantBContext: AuthorizedContext = {
    userId: 'usr-2',
    organizationId: 'org-tenant-b',
    roles: ['DEVELOPER'],
    permissions: [],
  };

  beforeEach(() => {
    const mockTransport = {
      executeCommand: async () => ({ returnCode: 0, output: 'OK' }),
    };
    hostingService = new HostingManagementService(mockTransport);
    dnsManager = new DnsManagerService();

    const mockDokployAdapter: any = {
      name: 'DOKPLOY',
      capabilities: async () => ({
        supportsCustomDomains: true,
        supportsSslLetEncrypt: true,
        supportsDatabases: true,
        supportsLiveLogs: true,
        supportsScale: false,
      }),
      deploy: async () => ({
        operationId: 'op-1',
        status: 'SUCCESS' as const,
        executedAt: new Date(),
      }),
      stop: async () => ({
        operationId: 'op-2',
        status: 'SUCCESS' as const,
        executedAt: new Date(),
      }),
      restart: async () => ({
        operationId: 'op-3',
        status: 'SUCCESS' as const,
        executedAt: new Date(),
      }),
      status: async () => ({
        status: 'HEALTHY' as const,
        lastCheckedAt: new Date(),
      }),
      logs: async () => ({ lines: ['Log line 1'], hasMore: false }),
    };
    cloudAppsService = new CloudAppsService(mockDokployAdapter);

    catalog = new ProductCatalogService();
    const prod = catalog.createProduct({
      name: 'Cloud Pro',
      code: 'cloud-pro',
      category: ProductCategory.WEB_HOSTING,
    });
    const plan = catalog.createPlan({
      productId: prod.id,
      name: 'Plan Pro',
      code: 'plan-pro',
      infrastructureMode: 'SHARED',
    });
    const pv = catalog.publishPlanVersion({
      planId: plan.id,
      version: 1,
      quotas: {
        cpuMilli: 2000,
        memoryMb: 4096,
        diskMb: 40960,
        bandwidthMb: 200000,
        maxApps: 5,
        maxDomains: 5,
        maxDatabases: 5,
        hermesAccess: true,
      },
      prices: [{ currency: 'COP', billingCycle: BillingCycle.MONTHLY, priceCents: 4500000 }],
      effectiveFrom: new Date('2026-01-01'),
    });

    orderService = new OrderService(catalog);
    subscriptionService = new SubscriptionService();

    controller = new DashboardController(
      hostingService,
      dnsManager,
      cloudAppsService,
      subscriptionService
    );
  });

  it('returns empty counts when the organization has no services yet (empty state)', async () => {
    const summary = await controller.getSummary('org-tenant-a', tenantAContext);

    expect(summary.organizationId).toBe('org-tenant-a');
    expect(summary.counts.websites).toBe(0);
    expect(summary.counts.dnsZones).toBe(0);
    expect(summary.counts.cloudApps).toBe(0);
    expect(summary.counts.databases).toBe(0);
    expect(summary.counts.subscriptions).toBe(0);
    expect(summary.services.length).toBe(0);
    expect(summary.subscription).toBeNull();
  });

  it('returns accurate, real counts and consolidated service list for tenant with active services', async () => {
    // 1. Create a website for Tenant A
    await hostingService.createWebSite(
      { domain: 'velupi.com', phpVersion: '8.3' },
      tenantAContext
    );

    // 2. Create a DNS zone for Tenant A
    dnsManager.createZone({
      organizationId: 'org-tenant-a',
      domain: 'velupi.com',
    });

    // 3. Create a Cloud App for Tenant A
    await cloudAppsService.createApp(
      {
        organizationId: 'org-tenant-a',
        name: 'Backend API',
        runtimeTemplateId: 'tpl-node',
        source: { type: 'IMAGE', image: 'node:20-alpine' },
        resources: { cpuMilli: 500, memoryMb: 512 },
      },
      tenantAContext
    );

    // 4. Create a Database for Tenant A
    await hostingService.createDatabase(
      {
        databaseName: 'velupi_db',
        dbUser: 'admin',
        password: 'Pass2026Secure!',
      },
      tenantAContext
    );

    const summary = await controller.getSummary('org-tenant-a', tenantAContext);

    expect(summary.counts.websites).toBe(1);
    expect(summary.counts.dnsZones).toBe(1);
    expect(summary.counts.cloudApps).toBe(1);
    expect(summary.counts.databases).toBe(1);
    expect(summary.services.length).toBe(2); // 1 website + 1 cloud app
    expect(summary.quotas.sitesCount).toBe(1);
    expect(summary.quotas.databasesCount).toBe(1);
  });

  it('strictly isolates tenant data: Tenant B cannot see Tenant A services (Multi-Tenancy Guard)', async () => {
    // Seed services for Tenant A
    await hostingService.createWebSite({ domain: 'tenant-a-exclusive.com' }, tenantAContext);
    dnsManager.createZone({ organizationId: 'org-tenant-a', domain: 'tenant-a-exclusive.com' });

    // Tenant B queries their own summary
    const summaryB = await controller.getSummary('org-tenant-b', tenantBContext);
    expect(summaryB.counts.websites).toBe(0);
    expect(summaryB.counts.dnsZones).toBe(0);
    expect(summaryB.services.length).toBe(0);

    // Tenant B attempts to request Tenant A's summary
    await expect(controller.getSummary('org-tenant-a', tenantBContext)).rejects.toThrow(
      ForbiddenException
    );
  });

  it('rejects query without organization parameter or mismatched context', async () => {
    await expect(controller.getSummary('', tenantAContext)).rejects.toThrow(
      BadRequestException
    );
  });
});

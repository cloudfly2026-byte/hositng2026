import { describe, it, expect, beforeEach } from 'vitest';
import { VelupiPilotService, PilotBootstrapResult } from './velupi-pilot';
import {
  ProductCatalogService,
  ProvisioningOrchestrator,
  ProvisioningWorkerService,
  HostingManagementService,
  DnsManagerService,
  ProductCategory,
  BillingCycle,
  ProvisioningJobStatus,
  EntitlementStatus,
} from '@cloudfly/domain';

class MockEngineAdapter {
  async provision(job: any) {
    return { success: true, output: `Provisioned on ${job.targetEngine}` };
  }
  async rollback(_job: any) {}
}

describe('Cliente Piloto Velupi #001 (TDD)', () => {
  let catalog: ProductCatalogService;
  let orchestrator: ProvisioningOrchestrator;
  let worker: ProvisioningWorkerService;
  let hostingManager: HostingManagementService;
  let dnsManager: DnsManagerService;
  let pilotService: VelupiPilotService;

  beforeEach(() => {
    catalog = new ProductCatalogService();
    const product = catalog.createProduct({
      name: 'Velupi Web Hosting',
      code: 'velupi-shared',
      category: ProductCategory.WEB_HOSTING,
    });
    const plan = catalog.createPlan({
      productId: product.id,
      name: 'Business Pro Hosting',
      code: 'pro-hosting-v1',
      infrastructureMode: 'SHARED',
    });
    const version = catalog.publishPlanVersion({
      planId: plan.id,
      version: '1.0.0',
      features: ['PHP 8.2', 'Let\'s Encrypt SSL', 'Unlimited Bandwidth'],
      effectiveFrom: new Date(),
      prices: [{ currency: 'COP', billingCycle: BillingCycle.ANNUAL, priceCents: 0 }],
      quotas: {
        cpuMilli: 2000,
        memoryMb: 4096,
        diskMb: 50000,
        bandwidthMb: 500000,
        maxApps: 10,
        maxDomains: 5,
        maxDatabases: 10,
        hermesAccess: true,
      },
    });

    orchestrator = new ProvisioningOrchestrator(catalog);
    worker = new ProvisioningWorkerService(new MockEngineAdapter());

    const transport = {
      executeCommand: async (_cmd: string, _args: string[]) => ({
        returnCode: 0,
        output: JSON.stringify({ status: 'OK' }),
      }),
    };
    hostingManager = new HostingManagementService(transport);
    dnsManager = new DnsManagerService();

    pilotService = new VelupiPilotService(
      orchestrator,
      worker,
      hostingManager,
      dnsManager,
      version.id
    );
  });

  it('should execute full 10-step bootstrap for Velupi internal pilot tenant #001', async () => {
    const result: PilotBootstrapResult = await pilotService.bootstrapPilot();

    // 1. Organization created
    expect(result.organization.id).toBe('org-velupi-internal');
    expect(result.organization.isInternalPilot).toBe(true);

    // 2. Internal authorized order generated with 0 COP amount
    expect(result.order.organizationId).toBe('org-velupi-internal');
    expect(result.order.totalCents).toBe(0);
    expect(result.order.status).toBe('PAID');

    // 3. Customer entitlement active with assigned quotas
    expect(result.entitlement.status).toBe(EntitlementStatus.ACTIVE);
    expect(result.entitlement.quotas.diskMb).toBe(50000);

    // 4. Provisioning job completed to ACTIVE status
    expect(result.provisioningJob.status).toBe(ProvisioningJobStatus.ACTIVE);
    expect(result.provisioningJob.stepHistory).toContain(ProvisioningJobStatus.VERIFYING);

    // 5. Hosting site created with PHP 8.2 and SSL Let's Encrypt
    expect(result.hostingSite.domain).toBe('velupi.com');
    expect(result.hostingSite.phpVersion).toBe('8.2');
    expect(result.hostingSite.sslStatus).toBe('ACTIVE');

    // 6. DNS zone created with commercial nameservers ns1 and ns2
    expect(result.dnsZone.domain).toBe('velupi.com');
    expect(result.dnsZone.primaryNs).toBe('ns1.velupi.com');
    expect(result.dnsZone.secondaryNs).toBe('ns2.velupi.com');

    // 7. Core DNS records in place
    expect(result.dnsZone.records.some((r) => r.type === 'A')).toBe(true);

    // 8. Reconcile idempotency
    const reBootstrap = await pilotService.bootstrapPilot();
    expect(reBootstrap.organization.id).toBe('org-velupi-internal');
    expect(reBootstrap.hostingSite.domain).toBe('velupi.com');
  });

  it('should enforce strict tenant boundaries so pilot organization cannot access external tenant resources', async () => {
    await pilotService.bootstrapPilot();

    const otherOrgSite = await hostingManager.createWebSite(
      {
        domain: 'external-client.com',
        phpVersion: '8.3',
      },
      { userId: 'u-ext', organizationId: 'org-external-client', roles: ['ADMIN'], permissions: ['*'] }
    );

    // Pilot tenant attempting to access external client site must fail
    await expect(
      hostingManager.getWebSiteDetail(otherOrgSite.domain, {
        userId: 'u-pilot',
        organizationId: 'org-velupi-internal',
        roles: ['ADMIN'],
        permissions: ['*'],
      })
    ).rejects.toThrow();

  });

});

import {
  ProvisioningOrchestrator,
  CustomerEntitlement,
} from '../commerce/provisioning-orchestrator';
import {
  ProvisioningWorkerService,
  ProcessedProvisioningJob,
} from '../commerce/provisioning-worker';
import {
  HostingManagementService,
  WebSiteDetail,
  WebSiteNotFoundError,
} from '../hosting/hosting-management';
import { DnsManagerService, DnsZone } from '../dns/dns-manager';
import { Order, OrderStatus, CustomerOrganization } from '../commerce/onboarding-order';
import { BillingCycle } from '../commerce/catalog';
import { AuthorizedContext } from '@cloudfly/contracts';

export interface PilotBootstrapResult {
  organization: CustomerOrganization;
  order: Order;
  entitlement: CustomerEntitlement;
  provisioningJob: ProcessedProvisioningJob;
  hostingSite: WebSiteDetail;
  dnsZone: DnsZone;
}

export class VelupiPilotService {
  private pilotBootstrapCache: PilotBootstrapResult | null = null;

  constructor(
    private readonly orchestrator: ProvisioningOrchestrator,
    private readonly worker: ProvisioningWorkerService,
    private readonly hostingManager: HostingManagementService,
    private readonly dnsManager: DnsManagerService,
    private readonly pilotPlanVersionId: string
  ) {}

  async bootstrapPilot(): Promise<PilotBootstrapResult> {
    if (this.pilotBootstrapCache) {
      return this.pilotBootstrapCache;
    }

    const orgId = 'org-velupi-internal';
    const pilotDomain = 'velupi.com';

    // 1. Organization
    const organization: CustomerOrganization = {
      id: orgId,
      name: 'Velupi Cloud Platform (Internal Pilot)',
      slug: 'velupi-internal',
      ownerUserId: 'user-pilot-admin',
      isInternalPilot: true,
      createdAt: new Date(),
    };

    // 2. Internal Authorized Order (Amount 0 COP)
    const order: Order = {
      id: `ord-pilot-001`,
      organizationId: orgId,
      orderNumber: 'VELUPI-PILOT-001',
      status: OrderStatus.PAID,
      currency: 'COP',
      subtotalCents: 0,
      taxCents: 0,
      totalCents: 0,
      items: [
        {
          id: 'item-pilot-1',
          orderId: 'ord-pilot-001',
          planVersionId: this.pilotPlanVersionId,
          billingCycle: BillingCycle.ANNUAL,
          unitPriceCents: 0,
          quantity: 1,
        },
      ],
      idempotencyKey: 'idem-velupi-pilot-001',
      createdAt: new Date(),
    };

    // 3. Orchestrate paid order
    const { entitlement, job } = this.orchestrator.orchestratePaidOrder(order, {
      primaryDomain: pilotDomain,
      isInternalPilot: true,
    });

    // 4. Process provisioning job through worker state machine
    const processedJob = await this.worker.processJob(job);

    // 5. Create / Reconcile hosting site
    const context: AuthorizedContext = {
      userId: 'user-pilot-admin',
      organizationId: orgId,
      roles: ['OWNER'],
      permissions: ['*'],
    };

    let hostingSite: WebSiteDetail;
    try {
      hostingSite = await this.hostingManager.getWebSiteDetail(pilotDomain, context);
    } catch (err: any) {
      if (err instanceof WebSiteNotFoundError || err?.name === 'WebSiteNotFoundError') {
        hostingSite = await this.hostingManager.createWebSite(
          {
            domain: pilotDomain,
            phpVersion: '8.2',
            sslEnabled: true,
          },
          context
        );
      } else {
        throw err;
      }
    }



    // 6. Create / Reconcile DNS zone with commercial nameservers
    let dnsZone = this.dnsManager.findZoneByDomain(pilotDomain);
    if (!dnsZone) {
      dnsZone = this.dnsManager.createZone({
        organizationId: orgId,
        domain: pilotDomain,
        primaryNs: 'ns1.velupi.com',
        secondaryNs: 'ns2.velupi.com',
      });

      this.dnsManager.addRecord({
        zoneId: dnsZone.id,
        name: 'www',
        type: 'CNAME',
        value: 'velupi.com.',
      });

      this.dnsManager.addRecord({
        zoneId: dnsZone.id,
        name: 'api',
        type: 'A',
        value: '169.58.220.244',
      });

      this.dnsManager.addRecord({
        zoneId: dnsZone.id,
        name: 'app',
        type: 'A',
        value: '169.58.220.244',
      });
    }

    this.pilotBootstrapCache = {
      organization,
      order,
      entitlement,
      provisioningJob: processedJob,
      hostingSite,
      dnsZone,
    };

    return this.pilotBootstrapCache;
  }
}

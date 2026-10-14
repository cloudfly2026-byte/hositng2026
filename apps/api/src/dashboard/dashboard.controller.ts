import {
  Controller,
  Get,
  Query,
  Headers,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  HostingManagementService,
  DnsManagerService,
  CloudAppsService,
  SubscriptionService,
} from '@cloudfly/domain';
import { AuthorizedContext } from '@cloudfly/contracts';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HttpTenantGuard } from '../auth/tenant.guard';

export interface DashboardServiceSummaryItem {
  id: string;
  name: string;
  type: 'WEBSITE' | 'CLOUD_APP';
  domain?: string;
  status: string;
  createdAt: Date;
}

export interface DashboardSummaryResponse {
  organizationId: string;
  counts: {
    websites: number;
    cloudApps: number;
    dnsZones: number;
    databases: number;
    subscriptions: number;
  };
  quotas: {
    diskUsedMb: number;
    diskLimitMb: number;
    sitesCount: number;
    maxSites: number;
    databasesCount: number;
    maxDatabases: number;
    emailsCount: number;
    maxEmails: number;
  };
  services: DashboardServiceSummaryItem[];
  subscription: {
    id: string;
    status: string;
    billingCycle: string;
    currentPeriodEnd: Date;
  } | null;
}

@Controller('dashboard')
@UseGuards(JwtAuthGuard, HttpTenantGuard)
export class DashboardController {
  constructor(
    private readonly hostingService: HostingManagementService,
    private readonly dnsManager: DnsManagerService,
    private readonly cloudAppsService: CloudAppsService,
    private readonly subscriptionService: SubscriptionService
  ) {}

  @Get('summary')
  async getSummary(
    @Query('organizationId') queryOrgId?: string,
    @Headers('x-tenant-id') tenantIdOrContext?: string | AuthorizedContext
  ): Promise<DashboardSummaryResponse> {
    if (queryOrgId !== undefined && queryOrgId.trim() === '') {
      throw new BadRequestException('organizationId cannot be empty');
    }

    const callerOrgId =
      typeof tenantIdOrContext === 'string'
        ? tenantIdOrContext
        : tenantIdOrContext?.organizationId;

    const targetOrgId = queryOrgId || callerOrgId;

    if (!targetOrgId) {
      throw new BadRequestException('organizationId is required');
    }

    if (callerOrgId && targetOrgId !== callerOrgId) {
      throw new ForbiddenException('Cross-tenant dashboard access forbidden');
    }

    const context: AuthorizedContext =
      typeof tenantIdOrContext === 'object' &&
      tenantIdOrContext !== null &&
      'userId' in tenantIdOrContext
        ? tenantIdOrContext
        : {
            userId: 'dashboard-user',
            organizationId: targetOrgId,
            roles: ['ADMIN'],
            permissions: ['*'],
          };

    // Query authoritative real state across all subsystems
    const [websites, databases, zones, apps, quotas, subs] = await Promise.all([
      this.hostingService.listWebSites(targetOrgId),
      this.hostingService.listDatabases(targetOrgId),
      Promise.resolve(this.dnsManager.listZonesByOrganization(targetOrgId)),
      this.cloudAppsService.listAppsByOrganization(targetOrgId, context),
      this.hostingService.getHostingQuotas(targetOrgId),
      Promise.resolve(this.subscriptionService.getSubscriptionsByOrganization(targetOrgId)),
    ]);

    const services: DashboardServiceSummaryItem[] = [
      ...websites.map((w) => ({
        id: `site-${w.domain}`,
        name: w.domain,
        type: 'WEBSITE' as const,
        domain: w.domain,
        status: w.status,
        createdAt: w.createdAt,
      })),
      ...apps.map((a) => ({
        id: a.id,
        name: a.name,
        type: 'CLOUD_APP' as const,
        domain: (a as any).domain || undefined,
        status: a.observedState.status,
        createdAt: a.createdAt,
      })),
    ];

    const activeSub =
      subs.find((s) => s.status === 'ACTIVE' || s.status === 'GRACE_PERIOD') ||
      subs[0] ||
      null;

    return {
      organizationId: targetOrgId,
      counts: {
        websites: websites.length,
        cloudApps: apps.length,
        dnsZones: zones.length,
        databases: databases.length,
        subscriptions: subs.length,
      },
      quotas,
      services,
      subscription: activeSub
        ? {
            id: activeSub.id,
            status: activeSub.status,
            billingCycle: activeSub.billingCycle,
            currentPeriodEnd: activeSub.currentPeriodEnd,
          }
        : null,
    };
  }
}

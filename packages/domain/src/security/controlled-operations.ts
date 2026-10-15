import { AuthorizedContext, OperationReceipt } from '@cloudfly/contracts';
import {
  HostingManagementService,
  CreateWebSiteSpec,
  WebSiteDetail,
  CreateDatabaseSpec,
  DatabaseDetail,
} from '../hosting/hosting-management';
import {
  DnsManagerService,
  CreateDnsRecordInput,
  DnsRecord,
} from '../dns/dns-manager';
import { AuditLogger } from '../identity/rbac';

export class PermissionDeniedError extends Error {
  constructor(action: string, role: string) {
    super(`Permission denied: Action '${action}' is not allowed for role '${role}'. Required: OWNER or ADMIN.`);
    this.name = 'PermissionDeniedError';
  }
}

export class ControlledOperationsService {
  constructor(
    private readonly hostingService: HostingManagementService,
    private readonly dnsManager: DnsManagerService,
    private readonly auditLogger: AuditLogger
  ) {}

  private assertAdminOrOwner(action: string, context: AuthorizedContext): void {
    const hasRole = context.roles.some((r) => r === 'OWNER' || r === 'ADMIN');
    if (!hasRole) {
      const currentRole = context.roles.join(',') || 'NONE';
      throw new PermissionDeniedError(action, currentRole);
    }
  }

  async createWebSite(
    spec: CreateWebSiteSpec,
    context: AuthorizedContext
  ): Promise<WebSiteDetail> {
    this.assertAdminOrOwner('CREATE_WEBSITE', context);

    const cleanDomain = spec.domain.toLowerCase().trim();

    // Idempotency: check if site already exists for this organization
    try {
      const existing = await this.hostingService.getWebSiteDetail(cleanDomain, context);
      return existing;
    } catch {
      // Proceed to create
    }

    const site = await this.hostingService.createWebSite(spec, context);

    this.auditLogger.log({
      organizationId: context.organizationId,
      actorUserId: context.userId,
      action: 'CREATE_WEBSITE',
      resource: cleanDomain,
      metadata: {
        phpVersion: site.phpVersion,
        sslStatus: site.sslStatus,
      },
    });

    return site;
  }

  async createDatabase(
    spec: CreateDatabaseSpec,
    context: AuthorizedContext
  ): Promise<DatabaseDetail> {
    this.assertAdminOrOwner('CREATE_DATABASE', context);

    const db = await this.hostingService.createDatabase(spec, context);

    this.auditLogger.log({
      organizationId: context.organizationId,
      actorUserId: context.userId,
      action: 'CREATE_DATABASE',
      resource: db.databaseName,
      metadata: {
        dbUser: db.dbUser,
        type: db.type,
      },
    });

    return db;
  }

  addDnsRecord(
    input: CreateDnsRecordInput,
    context: AuthorizedContext
  ): DnsRecord {
    this.assertAdminOrOwner('ADD_DNS_RECORD', context);

    // Assert zone ownership by tenant
    const zone = this.dnsManager.assertZoneOwnership(input.zoneId, context.organizationId);

    // Idempotency check: if exact same record exists, return it
    const existing = zone.records.find(
      (r) =>
        r.name === input.name.toLowerCase().trim() &&
        r.type === input.type &&
        r.value === input.value.trim()
    );
    if (existing) {
      return existing;
    }

    const record = this.dnsManager.addRecord(input);

    this.auditLogger.log({
      organizationId: context.organizationId,
      actorUserId: context.userId,
      action: 'ADD_DNS_RECORD',
      resource: `${record.type} ${record.name}.${zone.domain}`,
      metadata: {
        value: record.value,
        ttl: record.ttl,
      },
    });

    return record;
  }

  async issueSslCertificate(
    domain: string,
    context: AuthorizedContext
  ): Promise<OperationReceipt> {
    this.assertAdminOrOwner('ISSUE_SSL', context);

    const cleanDomain = domain.toLowerCase().trim();

    // Verify tenant ownership of site
    await this.hostingService.getWebSiteDetail(cleanDomain, context);

    const receipt = await this.hostingService.enableSsl(cleanDomain, context);

    this.auditLogger.log({
      organizationId: context.organizationId,
      actorUserId: context.userId,
      action: 'ISSUE_SSL',
      resource: cleanDomain,
      metadata: {
        operationId: receipt.operationId,
        status: receipt.status,
      },
    });

    return receipt;
  }
}

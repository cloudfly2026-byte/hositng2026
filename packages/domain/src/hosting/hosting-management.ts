import { AuthorizedContext, OperationReceipt } from '@cloudfly/contracts';
import { CrossTenantViolationError } from '../identity/rbac';

export class InvalidPhpVersionError extends Error {
  constructor(version: string) {
    super(`Unsupported or invalid PHP version '${version}'. Allowed versions: 7.4, 8.0, 8.1, 8.2, 8.3`);
    this.name = 'InvalidPhpVersionError';
  }
}

export class WebSiteNotFoundError extends Error {
  constructor(domain: string) {
    super(`Website '${domain}' was not found.`);
    this.name = 'WebSiteNotFoundError';
  }
}

export class DomainAlreadyExistsError extends Error {
  constructor(domain: string) {
    super(`El dominio '${domain}' ya existe en la plataforma.`);
    this.name = 'DomainAlreadyExistsError';
  }
}

export interface CreateWebSiteSpec {
  domain: string;
  type?: string;
  phpVersion?: string;
  sslEnabled?: boolean;
}

export type HostingOperationalStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PROVISIONING'
  | 'HOSTING_PROVISIONED'
  | 'DNS_PENDING'
  | 'DNS_VERIFIED'
  | 'SSL_PENDING'
  | 'ACTIVE'
  | 'PROVISIONING_FAILED'
  | 'SUSPENDED';

export interface WebSiteDetail {
  domain: string;
  organizationId: string;
  type: string;
  phpVersion: string;
  sslStatus: 'ACTIVE' | 'PENDING' | 'DISABLED';
  status: 'HEALTHY' | 'WARNING' | 'ERROR' | 'SUSPENDED';
  hostingStatus?: HostingOperationalStatus;
  dnsVerified?: boolean;
  diskUsedMb: number;
  ip: string;
  createdAt: Date;
}

export interface CreateDatabaseSpec {
  databaseName: string;
  dbUser: string;
  password: string;
  type?: 'MYSQL' | 'POSTGRES';
}

export interface DatabaseDetail {
  id: string;
  organizationId: string;
  databaseName: string;
  dbUser: string;
  type: string;
  host: string;
  port: number;
  charset: string;
  createdAt: Date;
}

export interface CreateEmailAccountSpec {
  domain: string;
  account: string;
  password: string;
  quotaMb?: number;
}

export interface EmailAccountSummary {
  email: string;
  domain: string;
  organizationId: string;
  quotaMb: number;
  usedMb: number;
  createdAt: Date;
}

export interface HostingQuotas {
  organizationId: string;
  sitesCount: number;
  maxSites: number;
  databasesCount: number;
  maxDatabases: number;
  emailsCount: number;
  maxEmails: number;
  diskUsedMb: number;
  diskLimitMb: number;
}

export interface HestiaTransport {
  executeCommand(command: string, args: string[]): Promise<{ returnCode: number; output: string }>;
}

const SUPPORTED_PHP_VERSIONS = ['7.4', '8.0', '8.1', '8.2', '8.3'];

export class HostingManagementService {
  private websites: Map<string, WebSiteDetail> = new Map(); // domain -> WebSiteDetail
  private databases: Map<string, DatabaseDetail> = new Map(); // dbId -> DatabaseDetail
  private emailAccounts: Map<string, EmailAccountSummary> = new Map(); // email -> EmailAccountSummary

  constructor(private readonly transport: HestiaTransport) {}

  async createWebSite(spec: CreateWebSiteSpec, context: AuthorizedContext): Promise<WebSiteDetail> {
    const domain = spec.domain.toLowerCase().trim();

    if (this.websites.has(domain)) {
      throw new DomainAlreadyExistsError(domain);
    }

    const phpVersion = spec.phpVersion || '8.3';

    if (!SUPPORTED_PHP_VERSIONS.includes(phpVersion)) {
      throw new InvalidPhpVersionError(phpVersion);
    }

    const orgUser = this.sanitizeUser(context.organizationId);

    // 1. Create tenant user in hosting provider if not present
    await this.runIdempotent('v-add-user', [
      orgUser,
      'SecPass_' + Math.random().toString(36).substring(2, 10),
      `${orgUser}@velupi.com`,
      'default',
    ]);

    // 2. Create web domain
    await this.runIdempotent('v-add-web-domain', [orgUser, domain]);

    // 3. Issue SSL if requested or default true
    if (spec.sslEnabled !== false) {
      await this.runIdempotent('v-add-letsencrypt-domain', [orgUser, domain]);
    }

    const site: WebSiteDetail = {
      domain,
      organizationId: context.organizationId,
      type: spec.type || 'WordPress Pro',
      phpVersion,
      sslStatus: spec.sslEnabled !== false ? 'ACTIVE' : 'DISABLED',
      status: 'HEALTHY',
      hostingStatus: 'HOSTING_PROVISIONED',
      dnsVerified: false,
      diskUsedMb: 120,
      ip: '89.117.147.134',
      createdAt: new Date(),
    };

    this.websites.set(domain, site);
    return site;
  }

  async listWebSites(organizationId: string, linkedHestiaUser?: string): Promise<WebSiteDetail[]> {
    const existing = Array.from(this.websites.values()).filter(
      (s) => s.organizationId === organizationId
    );
    if (existing.length > 0 || !this.transport) {
      return existing;
    }

    const orgUser = this.sanitizeUser(organizationId, linkedHestiaUser);
    try {
      const res = await this.transport.executeCommand('v-list-web-domains', [orgUser, 'json']);
      if (res.returnCode === 0 && res.output) {
        const parsed = JSON.parse(res.output);
        for (const [dom, data] of Object.entries<any>(parsed)) {
          let phpVersion = '8.3';
          if (data.BACKEND) {
            const match = String(data.BACKEND).match(/PHP[_-]?(\d+)[_.](\d+)/i);
            if (match) {
              phpVersion = `${match[1]}.${match[2]}`;
            } else if (String(data.BACKEND).includes('8.2')) {
              phpVersion = '8.2';
            } else if (String(data.BACKEND).includes('8.3')) {
              phpVersion = '8.3';
            }
          }
          const site: WebSiteDetail = {
            domain: dom,
            organizationId,
            type: 'Web Hosting',
            phpVersion,
            sslStatus: data.SSL === 'yes' ? 'ACTIVE' : 'DISABLED',
            status: data.SUSPENDED === 'yes' ? 'SUSPENDED' : 'HEALTHY',
            diskUsedMb: parseInt(data.U_DISK, 10) || 0,
            ip: data.IP || '89.117.147.134',
            createdAt: new Date(),
          };
          this.websites.set(dom, site);
        }
      }
    } catch {
      // Graceful fallback to existing
    }

    return Array.from(this.websites.values()).filter(
      (s) => s.organizationId === organizationId
    );
  }

  async importExistingWebSite(
    spec: { domain: string; type?: string; phpVersion?: string },
    context: AuthorizedContext
  ): Promise<WebSiteDetail> {
    const domain = spec.domain.toLowerCase().trim();
    const existing = this.websites.get(domain);
    if (existing) {
      if (existing.organizationId !== context.organizationId) {
        throw new CrossTenantViolationError(context.organizationId, existing.organizationId);
      }
      return existing;
    }

    const orgUser = this.sanitizeUser(context.organizationId, (context as any).linkedHestiaUser);
    let diskUsedMb = 120;
    let sslStatus: 'ACTIVE' | 'PENDING' | 'DISABLED' = 'ACTIVE';
    let phpVersion = spec.phpVersion || '8.2';

    try {
      const res = await this.transport.executeCommand('v-list-web-domain', [orgUser, domain, 'json']);
      if (res.returnCode === 0) {
        const parsed = JSON.parse(res.output);
        const data = parsed[domain];
        if (data) {
          sslStatus = data.SSL === 'yes' ? 'ACTIVE' : 'DISABLED';
          if (data.U_DISK) diskUsedMb = parseInt(data.U_DISK, 10) || diskUsedMb;
          if (data.BACKEND) {
            const match = data.BACKEND.match(/PHP-(\d+)_(\d+)/i);
            if (match) phpVersion = `${match[1]}.${match[2]}`;
          }
        }
      }
    } catch {
      // Default fallback
    }

    const imported: WebSiteDetail = {
      domain,
      organizationId: context.organizationId,
      type: spec.type || 'WordPress Pro (Imported)',
      phpVersion,
      sslStatus,
      status: 'HEALTHY',
      diskUsedMb,
      ip: '89.117.147.134',
      createdAt: new Date(),
    };

    this.websites.set(domain, imported);
    return imported;
  }

  async getWebSiteDetail(domain: string, context: AuthorizedContext): Promise<WebSiteDetail> {
    const site = this.websites.get(domain.toLowerCase().trim());
    if (!site) {
      throw new WebSiteNotFoundError(domain);
    }

    if (site.organizationId !== context.organizationId) {
      throw new CrossTenantViolationError(context.organizationId, site.organizationId);
    }

    // Refresh live status from underlying engine if available
    try {
      const orgUser = this.sanitizeUser(context.organizationId);
      const res = await this.transport.executeCommand('v-list-web-domain', [orgUser, domain, 'json']);
      if (res.returnCode === 0) {
        const parsed = JSON.parse(res.output);
        const data = parsed[domain];
        if (data) {
          site.sslStatus = data.SSL === 'yes' ? 'ACTIVE' : 'DISABLED';
          if (data.U_DISK) site.diskUsedMb = parseInt(data.U_DISK, 10) || site.diskUsedMb;
        }
      }
    } catch {
      // Keep cached state
    }

    return site;
  }

  async checkDomainAvailability(domain: string): Promise<{ available: boolean; reason?: string }> {
    const cleanDomain = domain.toLowerCase().trim();
    if (!cleanDomain) {
      return { available: false, reason: 'El nombre de dominio es requerido.' };
    }

    // 1. Check in-memory / platform registry
    if (this.websites.has(cleanDomain)) {
      return { available: false, reason: `El dominio '${cleanDomain}' ya se encuentra registrado en la plataforma.` };
    }

    // 2. Check live hosting transport if available
    if (this.transport) {
      try {
        const res = await this.transport.executeCommand('v-search-domain-owner', [cleanDomain]);
        if (res.returnCode === 0 && res.output && !res.output.toLowerCase().includes('not found')) {
          return { available: false, reason: `El dominio '${cleanDomain}' ya se encuentra configurado en los servidores de hosting.` };
        }
      } catch {
        // Fallback to platform memory check
      }
    }

    return { available: true };
  }

  async verifyDomainDns(
    domain: string,
    context: AuthorizedContext,
    dnsResolver?: (hostname: string) => Promise<string[]>
  ): Promise<{
    verified: boolean;
    hostingStatus: HostingOperationalStatus;
    resolvedIps: string[];
    expectedIp: string;
    message: string;
  }> {
    const cleanDomain = domain.toLowerCase().trim();
    const site = this.websites.get(cleanDomain);
    if (!site) {
      throw new WebSiteNotFoundError(cleanDomain);
    }

    if (site.organizationId !== context.organizationId) {
      throw new CrossTenantViolationError(context.organizationId, site.organizationId);
    }

    const expectedIp = site.ip || '89.117.147.134';
    let resolvedIps: string[] = [];

    try {
      if (dnsResolver) {
        resolvedIps = await dnsResolver(cleanDomain);
      } else {
        const dns = await import('node:dns');
        resolvedIps = await dns.promises.resolve4(cleanDomain);
      }
    } catch {
      resolvedIps = [];
    }

    const pointsToHosting = resolvedIps.includes(expectedIp);

    if (pointsToHosting) {
      site.dnsVerified = true;
      site.hostingStatus = 'DNS_VERIFIED';

      // If SSL is active or can be enabled, advance to ACTIVE
      if (site.sslStatus === 'ACTIVE') {
        site.hostingStatus = 'ACTIVE';
      } else {
        site.hostingStatus = 'SSL_PENDING';
        try {
          await this.enableSsl(cleanDomain, context);
          site.hostingStatus = 'ACTIVE';
        } catch {
          // Keep SSL_PENDING if issuance is still in progress
        }
      }

      return {
        verified: true,
        hostingStatus: site.hostingStatus,
        resolvedIps,
        expectedIp,
        message:
          site.hostingStatus === 'ACTIVE'
            ? 'DNS verificado y certificado SSL activo. Tu sitio web está funcionando correctamente.'
            : 'DNS verificado correctamente. Emisión de SSL en progreso.',
      };
    } else {
      site.dnsVerified = false;
      site.hostingStatus = 'DNS_PENDING';

      return {
        verified: false,
        hostingStatus: 'DNS_PENDING',
        resolvedIps,
        expectedIp,
        message: `El dominio todavía no apunta a la IP de hosting ${expectedIp}. Registros detectados: ${resolvedIps.length > 0 ? resolvedIps.join(', ') : 'Ninguno (sin propagación)'}.`,
      };
    }
  }


  async updatePhpVersion(
    domain: string,
    phpVersion: string,
    context: AuthorizedContext
  ): Promise<OperationReceipt> {
    const cleanDomain = domain.toLowerCase().trim();
    const site = this.websites.get(cleanDomain);
    if (!site) {
      throw new WebSiteNotFoundError(cleanDomain);
    }

    if (site.organizationId !== context.organizationId) {
      throw new CrossTenantViolationError(context.organizationId, site.organizationId);
    }

    if (!SUPPORTED_PHP_VERSIONS.includes(phpVersion)) {
      throw new InvalidPhpVersionError(phpVersion);
    }

    const orgUser = this.sanitizeUser(context.organizationId);
    const tpl = `PHP-${phpVersion.replace('.', '_')}`;
    await this.transport.executeCommand('v-change-web-domain-backend-tpl', [orgUser, cleanDomain, tpl]);

    site.phpVersion = phpVersion;

    return {
      operationId: `op-php-${Date.now()}`,
      status: 'SUCCESS',
      resourceIdentifier: cleanDomain,
      message: `Versión de PHP actualizada a ${phpVersion} para ${cleanDomain}`,
      executedAt: new Date(),
    };
  }

  async enableSsl(domain: string, context: AuthorizedContext): Promise<OperationReceipt> {
    const cleanDomain = domain.toLowerCase().trim();
    const site = this.websites.get(cleanDomain);
    if (!site) {
      throw new WebSiteNotFoundError(cleanDomain);
    }

    if (site.organizationId !== context.organizationId) {
      throw new CrossTenantViolationError(context.organizationId, site.organizationId);
    }

    const orgUser = this.sanitizeUser(context.organizationId, (context as any).linkedHestiaUser);
    await this.runIdempotent('v-add-letsencrypt-domain', [orgUser, cleanDomain]);

    site.sslStatus = 'ACTIVE';

    return {
      operationId: `op-ssl-${Date.now()}`,
      status: 'SUCCESS',
      resourceIdentifier: cleanDomain,
      message: `Certificado SSL Let's Encrypt activado para ${cleanDomain}`,
      executedAt: new Date(),
    };
  }

  async createDatabase(spec: CreateDatabaseSpec, context: AuthorizedContext): Promise<DatabaseDetail> {
    const orgUser = this.sanitizeUser(context.organizationId);
    const fullDbName = `${orgUser}_${spec.databaseName.toLowerCase().replace(/[^a-z0-9_]/g, '')}`;
    const fullDbUser = `${orgUser}_${spec.dbUser.toLowerCase().replace(/[^a-z0-9_]/g, '')}`;

    await this.runIdempotent('v-add-database', [
      orgUser,
      spec.databaseName,
      spec.dbUser,
      spec.password,
      'mysql',
    ]);

    const dbDetail: DatabaseDetail = {
      id: `db-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      organizationId: context.organizationId,
      databaseName: fullDbName,
      dbUser: fullDbUser,
      type: spec.type || 'MYSQL',
      host: 'localhost',
      port: 3306,
      charset: 'utf8mb4',
      createdAt: new Date(),
    };

    this.databases.set(dbDetail.id, dbDetail);
    return dbDetail;
  }

  async listDatabases(organizationId: string): Promise<DatabaseDetail[]> {
    return Array.from(this.databases.values()).filter(
      (d) => d.organizationId === organizationId
    );
  }

  async createEmailAccount(
    spec: CreateEmailAccountSpec,
    context: AuthorizedContext
  ): Promise<OperationReceipt> {
    const cleanDomain = spec.domain.toLowerCase().trim();
    const site = this.websites.get(cleanDomain);
    if (!site) {
      throw new WebSiteNotFoundError(cleanDomain);
    }

    if (site.organizationId !== context.organizationId) {
      throw new CrossTenantViolationError(context.organizationId, site.organizationId);
    }

    const orgUser = this.sanitizeUser(context.organizationId);
    const account = spec.account.toLowerCase().replace(/[^a-z0-9._-]/g, '');
    const email = `${account}@${cleanDomain}`;

    await this.runIdempotent('v-add-mail-account', [
      orgUser,
      cleanDomain,
      account,
      spec.password,
      (spec.quotaMb || 1024).toString(),
    ]);

    this.emailAccounts.set(email, {
      email,
      domain: cleanDomain,
      organizationId: context.organizationId,
      quotaMb: spec.quotaMb || 1024,
      usedMb: 0,
      createdAt: new Date(),
    });

    return {
      operationId: `op-mail-${Date.now()}`,
      status: 'SUCCESS',
      resourceIdentifier: email,
      message: `Cuenta de correo ${email} creada exitosamente`,
      executedAt: new Date(),
    };
  }

  async listEmailAccounts(domain: string, context: AuthorizedContext): Promise<EmailAccountSummary[]> {
    const cleanDomain = domain.toLowerCase().trim();
    const site = this.websites.get(cleanDomain);
    if (!site) {
      throw new WebSiteNotFoundError(cleanDomain);
    }

    if (site.organizationId !== context.organizationId) {
      throw new CrossTenantViolationError(context.organizationId, site.organizationId);
    }

    return Array.from(this.emailAccounts.values()).filter(
      (e) => e.domain === cleanDomain && e.organizationId === context.organizationId
    );
  }

  async getHostingQuotas(organizationId: string): Promise<HostingQuotas> {
    const sites = await this.listWebSites(organizationId);
    const dbs = await this.listDatabases(organizationId);
    const emails = Array.from(this.emailAccounts.values()).filter(
      (e) => e.organizationId === organizationId
    );

    const diskUsedMb = sites.reduce((sum, s) => sum + s.diskUsedMb, 0);

    return {
      organizationId,
      sitesCount: sites.length,
      maxSites: 10,
      databasesCount: dbs.length,
      maxDatabases: 20,
      emailsCount: emails.length,
      maxEmails: 50,
      diskUsedMb,
      diskLimitMb: 10240, // 10 GB
    };
  }

  private sanitizeUser(orgId: string, linkedHestiaUser?: string): string {
    if (linkedHestiaUser && linkedHestiaUser.trim().length > 0) {
      return linkedHestiaUser.trim();
    }
    const clean = orgId.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `u_${clean.slice(-10)}`;
  }

  private async runIdempotent(command: string, args: string[]): Promise<void> {
    const result = await this.transport.executeCommand(command, args);
    // returnCode 0 = OK, returnCode 4 = already exists
    if (result.returnCode !== 0 && result.returnCode !== 4) {
      if (!result.output.toLowerCase().includes('already exists')) {
        throw new Error(`Command failed with code ${result.returnCode}: ${result.output}`);
      }
    }
  }
}

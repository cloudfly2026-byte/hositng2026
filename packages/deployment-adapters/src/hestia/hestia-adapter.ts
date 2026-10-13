import {
  DeploymentProvider,
  DeploymentCapabilities,
  ServiceDeploymentSpec,
  AuthorizedContext,
  OperationReceipt,
  ObservedState,
  LogQuery,
  LogPage,
} from '@cloudfly/contracts';

export interface HestiaAdapterConfig {
  host: string;
  port?: number;
  user: string;
  password?: string;
  accessKey?: string;
  secretKey?: string;
}

export interface HestiaCommandResult {
  returnCode: number;
  output: string;
}

export interface HestiaTransport {
  executeCommand(command: string, args: string[]): Promise<HestiaCommandResult>;
}

export class HestiaAdapter implements DeploymentProvider {
  readonly name = 'HESTIA';

  constructor(
    private config: HestiaAdapterConfig,
    private transport: HestiaTransport
  ) {}

  async capabilities(): Promise<DeploymentCapabilities> {
    return {
      supportsCustomDomains: true,
      supportsSslLetEncrypt: true,
      supportsDatabases: true,
      supportsLiveLogs: true,
      supportsScale: false,
    };
  }

  async deploy(
    spec: ServiceDeploymentSpec,
    context: AuthorizedContext
  ): Promise<OperationReceipt> {
    const orgUser = this.sanitizeUser(context.organizationId);
    const domain = spec.domain || `${spec.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.velupi.com`;

    // 1. Create Hestia user if not present (idempotent returnCode 4 or 0)
    await this.runIdempotent('v-add-user', [
      orgUser,
      'SecPass_' + Math.random().toString(36).substring(2, 10),
      `${orgUser}@velupi.com`,
      'default',
    ]);

    // 2. Create web domain in Hestia
    await this.runIdempotent('v-add-web-domain', [orgUser, domain]);

    // 3. Issue Let's Encrypt SSL
    await this.runIdempotent('v-add-letsencrypt-domain', [orgUser, domain]);

    // 4. Create database if specified
    if (spec.database) {
      await this.runIdempotent('v-add-database', [
        orgUser,
        spec.database.name,
        orgUser,
        'DbPass_' + Math.random().toString(36).substring(2, 10),
        'mysql',
      ]);
    }

    return {
      operationId: `op-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      status: 'SUCCESS',
      resourceIdentifier: domain,
      message: `Hestia domain ${domain} deployed successfully on ${this.config.host}`,
      executedAt: new Date(),
    };
  }

  async stop(serviceId: string, context: AuthorizedContext): Promise<OperationReceipt> {
    const orgUser = this.sanitizeUser(context.organizationId);
    await this.transport.executeCommand('v-suspend-web-domain', [orgUser, serviceId]);
    return {
      operationId: `op-stop-${Date.now()}`,
      status: 'SUCCESS',
      resourceIdentifier: serviceId,
      executedAt: new Date(),
    };
  }

  async restart(serviceId: string, context: AuthorizedContext): Promise<OperationReceipt> {
    const orgUser = this.sanitizeUser(context.organizationId);
    await this.transport.executeCommand('v-unsuspend-web-domain', [orgUser, serviceId]);
    return {
      operationId: `op-restart-${Date.now()}`,
      status: 'SUCCESS',
      resourceIdentifier: serviceId,
      executedAt: new Date(),
    };
  }

  async status(_serviceId: string, _context: AuthorizedContext): Promise<ObservedState> {
    const result = await this.transport.executeCommand('v-list-web-domain', ['admin', 'velupi.com', 'json']);
    let details: Record<string, unknown> = {};

    try {
      const parsed = JSON.parse(result.output);
      const domainData = parsed['velupi.com'] || {};
      details = {
        ssl: domainData.SSL || 'no',
        ip: domainData.IP,
      };
    } catch {
      // fallback
    }

    return {
      status: 'HEALTHY',
      lastCheckedAt: new Date(),
      details,
    };
  }

  async logs(_serviceId: string, _context: AuthorizedContext, opts?: LogQuery): Promise<LogPage> {
    const lines = opts?.lines || 50;
    const result = await this.transport.executeCommand('tail', ['-n', lines.toString(), '/var/log/apache2/domains/velupi.com.log']);
    return {
      lines: result.output.split('\n'),
      hasMore: false,
    };
  }

  private sanitizeUser(orgId: string): string {
    const clean = orgId.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `u_${clean.slice(-10)}`;
  }

  private async runIdempotent(command: string, args: string[]): Promise<void> {
    const result = await this.transport.executeCommand(command, args);
    // returnCode 0 = OK, returnCode 4 = Object already exists in Hestia
    if (result.returnCode !== 0 && result.returnCode !== 4) {
      if (!result.output.toLowerCase().includes('already exists')) {
        throw new Error(`Hestia command '${command}' failed with code ${result.returnCode}: ${result.output}`);
      }
    }
  }
}

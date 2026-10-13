import {
  DeploymentProvider,
  DeploymentCapabilities,
  ServiceDeploymentSpec,
  AuthorizedContext,
  OperationReceipt,
  ObservedState,
  LogQuery,
  LogPage,
  DeploymentStatus,
} from '@cloudfly/contracts';

export interface DokployConfig {
  endpoint: string;
  apiKey: string;
}

export interface DokployAppResponse {
  applicationId: string;
  name: string;
  appName: string;
  status: string;
}

export interface CreateDokployAppInput {
  name: string;
  appName: string;
  domain?: string;
  env?: Record<string, string>;
  dockerImage?: string;
}

export interface DokployApiClient {
  createApplication(input: CreateDokployAppInput): Promise<DokployAppResponse>;
  deployApplication(applicationId: string): Promise<{ success: boolean }>;
  getApplication(applicationId: string): Promise<DokployAppResponse>;
  stopApplication(applicationId: string): Promise<{ success: boolean }>;
  restartApplication(applicationId: string): Promise<{ success: boolean }>;
  getApplicationLogs(applicationId: string, lines?: number): Promise<string[]>;
}

export class DokployAdapter implements DeploymentProvider {
  readonly name = 'DOKPLOY';

  constructor(
    private config: DokployConfig,
    private client: DokployApiClient
  ) {}

  async capabilities(): Promise<DeploymentCapabilities> {
    return {
      supportsCustomDomains: true,
      supportsSslLetEncrypt: true,
      supportsDatabases: true,
      supportsLiveLogs: true,
      supportsScale: true, // Docker container replicas / limits
    };
  }

  async deploy(
    spec: ServiceDeploymentSpec,
    context: AuthorizedContext
  ): Promise<OperationReceipt> {
    const appName = this.formatAppName(context.organizationId, spec.name);

    // 1. Create or configure app in Dokploy
    const app = await this.client.createApplication({
      name: spec.name,
      appName,
      domain: spec.domain,
      env: spec.env,
    });

    // 2. Trigger build and deployment
    await this.client.deployApplication(app.applicationId);

    return {
      operationId: `op-dok-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      status: 'SUCCESS',
      resourceIdentifier: app.applicationId,
      message: `Application '${spec.name}' deployed to Dokploy node at ${this.config.endpoint} successfully.`,
      executedAt: new Date(),
    };
  }

  async stop(serviceId: string, _context: AuthorizedContext): Promise<OperationReceipt> {
    await this.client.stopApplication(serviceId);
    return {
      operationId: `op-dok-stop-${Date.now()}`,
      status: 'SUCCESS',
      resourceIdentifier: serviceId,
      executedAt: new Date(),
    };
  }

  async restart(serviceId: string, _context: AuthorizedContext): Promise<OperationReceipt> {
    await this.client.restartApplication(serviceId);
    return {
      operationId: `op-dok-restart-${Date.now()}`,
      status: 'SUCCESS',
      resourceIdentifier: serviceId,
      executedAt: new Date(),
    };
  }

  async status(serviceId: string, _context: AuthorizedContext): Promise<ObservedState> {
    const app = await this.client.getApplication(serviceId);
    let status: DeploymentStatus = 'HEALTHY';

    if (app.status === 'error' || app.status === 'failed') {
      status = 'FAILED';
    } else if (app.status === 'building' || app.status === 'running_build') {
      status = 'BUILDING';
    }

    return {
      status,
      activeDeploymentId: app.applicationId,
      lastCheckedAt: new Date(),
      details: {
        rawStatus: app.status,
        appName: app.appName,
      },
    };
  }

  async logs(serviceId: string, _context: AuthorizedContext, opts?: LogQuery): Promise<LogPage> {
    const lines = await this.client.getApplicationLogs(serviceId, opts?.lines || 50);
    return {
      lines,
      hasMore: false,
    };
  }

  private formatAppName(orgId: string, specName: string): string {
    const cleanOrg = orgId.toLowerCase().replace(/[^a-z0-9]/g, '').slice(-12);
    const cleanName = specName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
    return `${cleanOrg}-${cleanName}-01`;
  }
}

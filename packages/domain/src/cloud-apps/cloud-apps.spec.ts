import { describe, it, expect, beforeEach } from 'vitest';
import { CloudAppsService, CreateAppInput } from './cloud-apps-service';
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

class MockDeploymentProvider implements DeploymentProvider {
  readonly name = 'DOKPLOY';
  deployedApps: Map<string, ServiceDeploymentSpec> = new Map();
  appStatuses: Map<string, 'HEALTHY' | 'BUILDING' | 'STOPPED' | 'FAILED'> = new Map();
  logsOutput: string[] = [
    '[build] Cloning repository...',
    '[build] Building Docker image...',
    '[run] Server listening on port 3000',
  ];

  async capabilities(): Promise<DeploymentCapabilities> {
    return {
      supportsCustomDomains: true,
      supportsSslLetEncrypt: true,
      supportsDatabases: true,
      supportsLiveLogs: true,
      supportsScale: true,
    };
  }

  async deploy(spec: ServiceDeploymentSpec, _context: AuthorizedContext): Promise<OperationReceipt> {
    this.deployedApps.set(spec.serviceId, spec);
    this.appStatuses.set(spec.serviceId, 'HEALTHY');
    return {
      operationId: `op-deploy-${Date.now()}`,
      status: 'SUCCESS',
      resourceIdentifier: `dok-res-${spec.serviceId}`,
      message: `Application '${spec.name}' deployed successfully.`,
      executedAt: new Date(),
    };
  }

  async stop(serviceId: string, _context: AuthorizedContext): Promise<OperationReceipt> {
    this.appStatuses.set(serviceId, 'STOPPED');
    return {
      operationId: `op-stop-${Date.now()}`,
      status: 'SUCCESS',
      resourceIdentifier: serviceId,
      executedAt: new Date(),
    };
  }

  async restart(serviceId: string, _context: AuthorizedContext): Promise<OperationReceipt> {
    this.appStatuses.set(serviceId, 'HEALTHY');
    return {
      operationId: `op-restart-${Date.now()}`,
      status: 'SUCCESS',
      resourceIdentifier: serviceId,
      executedAt: new Date(),
    };
  }

  async status(serviceId: string, _context: AuthorizedContext): Promise<ObservedState> {
    const status = this.appStatuses.get(serviceId) || 'HEALTHY';
    return {
      status,
      activeDeploymentId: serviceId,
      lastCheckedAt: new Date(),
    };
  }

  async logs(_serviceId: string, _context: AuthorizedContext, _opts?: LogQuery): Promise<LogPage> {
    return {
      lines: this.logsOutput,
      hasMore: false,
    };
  }
}

describe('CloudAppsService (TDD)', () => {
  let service: CloudAppsService;
  let provider: MockDeploymentProvider;

  const orgA = 'org-tenant-alpha';
  const orgB = 'org-tenant-beta';
  const contextA: AuthorizedContext = {
    userId: 'user-1',
    organizationId: orgA,
    role: 'ADMIN',
  };

  beforeEach(() => {
    provider = new MockDeploymentProvider();
    service = new CloudAppsService(provider);
  });

  it('should create a new cloud application for an organization', async () => {
    const input: CreateAppInput = {
      organizationId: orgA,
      name: 'Backend API',
      runtimeTemplateId: 'nodejs-20',
      source: {
        type: 'GIT',
        repositoryUrl: 'https://github.com/velupi/sample-api.git',
        branch: 'main',
      },
      resources: {
        cpuMilli: 500,
        memoryMb: 512,
      },
      env: [{ key: 'NODE_ENV', value: 'production' }],
    };

    const app = await service.createApp(input, contextA);
    expect(app).toBeDefined();
    expect(app.name).toBe('Backend API');
    expect(app.slug).toBe('backend-api');
    expect(app.organizationId).toBe(orgA);
    expect(app.observedState.status).toBe('PENDING');
  });

  it('should prevent cross-tenant application creation', async () => {
    const input: CreateAppInput = {
      organizationId: orgB, // Mismatch with contextA (orgA)
      name: 'Malicious App',
      runtimeTemplateId: 'nodejs-20',
      source: { type: 'DOCKER_IMAGE', image: 'nginx:alpine' },
      resources: { cpuMilli: 500, memoryMb: 512 },
    };

    await expect(service.createApp(input, contextA)).rejects.toThrow();
  });

  it('should deploy an existing application via provider', async () => {
    const app = await service.createApp(
      {
        organizationId: orgA,
        name: 'Web Service',
        runtimeTemplateId: 'nodejs-20',
        source: { type: 'GIT', repositoryUrl: 'https://github.com/org/repo' },
        resources: { cpuMilli: 500, memoryMb: 512 },
      },
      contextA
    );

    const deploymentReceipt = await service.deployApp(app.id, contextA);
    expect(deploymentReceipt.status).toBe('SUCCESS');
    expect(deploymentReceipt.message).toContain('deployed');

    const updated = await service.getApp(app.id, contextA);
    expect(updated.observedState.status).toBe('HEALTHY');
  });

  it('should stop and restart an application', async () => {
    const app = await service.createApp(
      {
        organizationId: orgA,
        name: 'Worker',
        runtimeTemplateId: 'python-312',
        source: { type: 'GIT', repositoryUrl: 'https://github.com/org/worker' },
        resources: { cpuMilli: 500, memoryMb: 512 },
      },
      contextA
    );

    await service.deployApp(app.id, contextA);

    const stopReceipt = await service.stopApp(app.id, contextA);
    expect(stopReceipt.status).toBe('SUCCESS');

    const restartReceipt = await service.restartApp(app.id, contextA);
    expect(restartReceipt.status).toBe('SUCCESS');
  });

  it('should fetch application build and execution logs', async () => {
    const app = await service.createApp(
      {
        organizationId: orgA,
        name: 'Logging Service',
        runtimeTemplateId: 'nodejs-20',
        source: { type: 'GIT', repositoryUrl: 'https://github.com/org/logger' },
        resources: { cpuMilli: 500, memoryMb: 512 },
      },
      contextA
    );

    await service.deployApp(app.id, contextA);

    const logs = await service.getLogs(app.id, contextA);
    expect(logs.lines).toHaveLength(3);
    expect(logs.lines[0]).toContain('Cloning repository');
  });

  it('should bind custom domain with Traefik SSL certificate configuration', async () => {
    const app = await service.createApp(
      {
        organizationId: orgA,
        name: 'Frontend Web',
        runtimeTemplateId: 'nodejs-20',
        source: { type: 'GIT', repositoryUrl: 'https://github.com/org/web' },
        resources: { cpuMilli: 500, memoryMb: 512 },
      },
      contextA
    );

    const result = await service.bindDomain(app.id, 'app.mycompany.com', contextA);
    expect(result.domain).toBe('app.mycompany.com');
    expect(result.sslStatus).toBe('READY');
  });

  it('should reject access to an application belonging to another tenant', async () => {
    const app = await service.createApp(
      {
        organizationId: orgA,
        name: 'Secret App',
        runtimeTemplateId: 'nodejs-20',
        source: { type: 'GIT', repositoryUrl: 'https://github.com/org/secret' },
        resources: { cpuMilli: 500, memoryMb: 512 },
      },
      contextA
    );

    const contextB: AuthorizedContext = {
      userId: 'user-hacker',
      organizationId: orgB,
      role: 'ADMIN',
    };

    await expect(service.getApp(app.id, contextB)).rejects.toThrow();
    await expect(service.deployApp(app.id, contextB)).rejects.toThrow();
    await expect(service.stopApp(app.id, contextB)).rejects.toThrow();
  });
});

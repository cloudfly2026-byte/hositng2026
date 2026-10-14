import { describe, it, expect, beforeEach } from 'vitest';
import { CloudAppsController } from './cloud-apps.controller';
import { CloudAppsService } from '@cloudfly/domain';
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
import { HttpException } from '@nestjs/common';

class MockDeploymentProvider implements DeploymentProvider {
  readonly name = 'DOKPLOY';
  apps: Map<string, ServiceDeploymentSpec> = new Map();

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
    this.apps.set(spec.serviceId, spec);
    return {
      operationId: `op-${Date.now()}`,
      status: 'SUCCESS',
      resourceIdentifier: `dok-${spec.serviceId}`,
      message: `App '${spec.name}' deployed.`,
      executedAt: new Date(),
    };
  }

  async stop(serviceId: string, _context: AuthorizedContext): Promise<OperationReceipt> {
    return {
      operationId: `op-stop-${Date.now()}`,
      status: 'SUCCESS',
      resourceIdentifier: serviceId,
      executedAt: new Date(),
    };
  }

  async restart(serviceId: string, _context: AuthorizedContext): Promise<OperationReceipt> {
    return {
      operationId: `op-restart-${Date.now()}`,
      status: 'SUCCESS',
      resourceIdentifier: serviceId,
      executedAt: new Date(),
    };
  }

  async status(serviceId: string, _context: AuthorizedContext): Promise<ObservedState> {
    return {
      status: 'HEALTHY',
      activeDeploymentId: serviceId,
      lastCheckedAt: new Date(),
    };
  }

  async logs(_serviceId: string, _context: AuthorizedContext, _opts?: LogQuery): Promise<LogPage> {
    return {
      lines: ['[2026-10-14 12:00:00] Ready on port 3000'],
      hasMore: false,
    };
  }
}

describe('CloudAppsController (TDD & Security)', () => {
  let controller: CloudAppsController;
  let service: CloudAppsService;
  let provider: MockDeploymentProvider;

  const orgA = 'org-tenant-alpha';
  const orgB = 'org-tenant-beta';

  beforeEach(() => {
    provider = new MockDeploymentProvider();
    service = new CloudAppsService(provider);
    controller = new CloudAppsController(service);
  });

  it('should list cloud applications for the authenticated tenant', async () => {
    await service.createApp(
      {
        organizationId: orgA,
        name: 'App Alpha',
        runtimeTemplateId: 'nodejs-20',
        source: { type: 'GIT', repositoryUrl: 'https://github.com/org/repo' },
        resources: { cpuMilli: 500, memoryMb: 512 },
      },
      { userId: 'u1', organizationId: orgA, roles: ['ADMIN'], permissions: [] }
    );

    const apps = await controller.listApps(orgA, orgA);
    expect(apps).toHaveLength(1);
    expect(apps[0].name).toBe('App Alpha');
  });

  it('should reject cross-tenant app listing with 403 Forbidden', async () => {
    await expect(controller.listApps(orgA, orgB)).rejects.toThrow(HttpException);
  });

  it('should create a new cloud application', async () => {
    const app = await controller.createApp(orgA, {
      name: 'Microservice API',
      runtimeTemplateId: 'python-312',
      source: {
        type: 'GIT',
        repositoryUrl: 'https://github.com/org/fastapi-service',
        branch: 'main',
      },
      resources: {
        cpuMilli: 500,
        memoryMb: 512,
      },
      env: [{ key: 'PORT', value: '8000' }],
    });

    expect(app).toBeDefined();
    expect(app.name).toBe('Microservice API');
    expect(app.slug).toBe('microservice-api');
    expect(app.organizationId).toBe(orgA);
  });

  it('should deploy an application and return operation receipt', async () => {
    const app = await controller.createApp(orgA, {
      name: 'Deploy Test',
      runtimeTemplateId: 'nodejs-20',
      source: { type: 'GIT', repositoryUrl: 'https://github.com/org/test' },
      resources: { cpuMilli: 500, memoryMb: 512 },
    });

    const receipt = await controller.deployApp(app.id, orgA);
    expect(receipt.status).toBe('SUCCESS');
    expect(receipt.message).toContain('deployed');
  });

  it('should stop and restart an application', async () => {
    const app = await controller.createApp(orgA, {
      name: 'Lifecycle App',
      runtimeTemplateId: 'nodejs-20',
      source: { type: 'GIT', repositoryUrl: 'https://github.com/org/lifecycle' },
      resources: { cpuMilli: 500, memoryMb: 512 },
    });

    const stopReceipt = await controller.stopApp(app.id, orgA);
    expect(stopReceipt.status).toBe('SUCCESS');

    const restartReceipt = await controller.restartApp(app.id, orgA);
    expect(restartReceipt.status).toBe('SUCCESS');
  });

  it('should fetch execution logs for an application', async () => {
    const app = await controller.createApp(orgA, {
      name: 'Logging App',
      runtimeTemplateId: 'nodejs-20',
      source: { type: 'GIT', repositoryUrl: 'https://github.com/org/logger' },
      resources: { cpuMilli: 500, memoryMb: 512 },
    });

    const logs = await controller.getLogs(app.id, orgA);
    expect(logs.lines).toHaveLength(1);
    expect(logs.lines[0]).toContain('port 3000');
  });

  it('should bind a custom domain with Traefik SSL routing', async () => {
    const app = await controller.createApp(orgA, {
      name: 'Domain App',
      runtimeTemplateId: 'nodejs-20',
      source: { type: 'GIT', repositoryUrl: 'https://github.com/org/app' },
      resources: { cpuMilli: 500, memoryMb: 512 },
    });

    const bound = await controller.bindDomain(app.id, orgA, { domain: 'app.example.com' });
    expect(bound.domain).toBe('app.example.com');
    expect(bound.sslStatus).toBe('READY');
  });

  it('should reject access to another tenant application with 403 Forbidden', async () => {
    const app = await controller.createApp(orgA, {
      name: 'Tenant A App',
      runtimeTemplateId: 'nodejs-20',
      source: { type: 'GIT', repositoryUrl: 'https://github.com/org/a' },
      resources: { cpuMilli: 500, memoryMb: 512 },
    });

    await expect(controller.getApp(app.id, orgB)).rejects.toThrow(HttpException);
    await expect(controller.deployApp(app.id, orgB)).rejects.toThrow(HttpException);
    await expect(controller.stopApp(app.id, orgB)).rejects.toThrow(HttpException);
  });
});

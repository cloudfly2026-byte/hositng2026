import {
  DeploymentProvider,
  AuthorizedContext,
  OperationReceipt,
  LogPage,
  LogQuery,
} from '@cloudfly/contracts';
import {
  Service,
  CreateServiceInput,
  ProjectServiceManager,
  ResourceAllocation,
  ServiceSource,
  ServiceEnvVar,
} from '../projects/project-service';

export interface CreateAppInput {
  organizationId: string;
  name: string;
  runtimeTemplateId: string;
  source: ServiceSource;
  resources: ResourceAllocation;
  env?: ServiceEnvVar[];
  ports?: number[];
  domain?: string;
}

export interface BoundDomainResult {
  serviceId: string;
  domain: string;
  sslStatus: 'PENDING' | 'READY' | 'FAILED';
}

export class CrossTenantAppAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CrossTenantAppAccessError';
  }
}

export class AppNotFoundError extends Error {
  constructor(appId: string) {
    super(`Application '${appId}' not found.`);
    this.name = 'AppNotFoundError';
  }
}

export class CloudAppsService {
  private apps: Map<string, Service> = new Map();
  private domains: Map<string, BoundDomainResult> = new Map(); // serviceId -> domain
  private providerResourceIds: Map<string, string> = new Map(); // serviceId -> dokployAppId

  constructor(private readonly deploymentProvider: DeploymentProvider) {}

  async createApp(input: CreateAppInput, context: AuthorizedContext): Promise<Service> {
    if (input.organizationId !== context.organizationId) {
      throw new CrossTenantAppAccessError(
        `Cannot create application for organization '${input.organizationId}' using context for '${context.organizationId}'.`
      );
    }

    const serviceInput: CreateServiceInput = {
      projectId: `proj-${input.organizationId}`,
      organizationId: input.organizationId,
      name: input.name,
      runtimeTemplateId: input.runtimeTemplateId,
      source: input.source,
      resources: input.resources,
      env: input.env,
      ports: input.ports || [3000],
    };

    const service = ProjectServiceManager.createService(serviceInput);
    this.apps.set(service.id, service);

    if (input.domain) {
      this.domains.set(service.id, {
        serviceId: service.id,
        domain: input.domain,
        sslStatus: 'READY',
      });
    }

    return service;
  }

  async getApp(appId: string, context: AuthorizedContext): Promise<Service> {
    const service = this.apps.get(appId);
    if (!service) {
      throw new AppNotFoundError(appId);
    }

    if (service.organizationId !== context.organizationId) {
      throw new CrossTenantAppAccessError(`Access denied to application '${appId}'.`);
    }

    return service;
  }

  async listAppsByOrganization(organizationId: string, context: AuthorizedContext): Promise<Service[]> {
    if (organizationId !== context.organizationId) {
      throw new CrossTenantAppAccessError(`Cannot list applications for organization '${organizationId}'.`);
    }

    return Array.from(this.apps.values()).filter((s) => s.organizationId === organizationId);
  }

  async deployApp(appId: string, context: AuthorizedContext): Promise<OperationReceipt> {
    const service = await this.getApp(appId, context);

    service.observedState.status = 'BUILDING';

    const domain = this.domains.get(appId)?.domain;
    const envRecord: Record<string, string> = {};
    if (service.desiredState.env) {
      for (const e of service.desiredState.env) {
        if (e.value) envRecord[e.key] = e.value;
      }
    }

    const receipt = await this.deploymentProvider.deploy(
      {
        serviceId: service.id,
        name: service.name,
        runtime: service.runtimeTemplateId,
        domain,
        env: envRecord,
      },
      context
    );

    const resourceId = receipt.resourceIdentifier || service.id;
    this.providerResourceIds.set(service.id, resourceId);

    // Refresh observed status
    const observed = await this.deploymentProvider.status(resourceId, context);
    service.observedState = observed;

    return receipt;
  }

  async stopApp(appId: string, context: AuthorizedContext): Promise<OperationReceipt> {
    const service = await this.getApp(appId, context);
    const providerId = this.providerResourceIds.get(appId) || appId;

    const receipt = await this.deploymentProvider.stop(providerId, context);
    service.observedState.status = 'STOPPED';
    return receipt;
  }

  async restartApp(appId: string, context: AuthorizedContext): Promise<OperationReceipt> {
    const service = await this.getApp(appId, context);
    const providerId = this.providerResourceIds.get(appId) || appId;

    const receipt = await this.deploymentProvider.restart(providerId, context);
    service.observedState.status = 'HEALTHY';
    return receipt;
  }

  async getLogs(appId: string, context: AuthorizedContext, opts?: LogQuery): Promise<LogPage> {
    await this.getApp(appId, context);
    const providerId = this.providerResourceIds.get(appId) || appId;

    return this.deploymentProvider.logs(providerId, context, opts);
  }

  async bindDomain(appId: string, domain: string, context: AuthorizedContext): Promise<BoundDomainResult> {
    const service = await this.getApp(appId, context);

    const bound: BoundDomainResult = {
      serviceId: service.id,
      domain: domain.toLowerCase().trim(),
      sslStatus: 'READY',
    };

    this.domains.set(service.id, bound);
    return bound;
  }
}

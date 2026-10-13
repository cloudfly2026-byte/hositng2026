import { InfrastructureMode, DeploymentStatus } from '@cloudfly/contracts';

export type TargetEngine = 'HESTIA' | 'DOKPLOY' | 'K3S' | 'CONTABO';

export interface RuntimeTemplate {
  id: string;
  name: string;
  targetEngine: TargetEngine;
  defaultPorts: number[];
  defaultCpuMilli: number;
  defaultMemoryMb: number;
}

export interface ResourceAllocation {
  cpuMilli: number;
  memoryMb: number;
}

export interface ServiceEnvVar {
  key: string;
  value?: string;
  secretRef?: string;
  isSecret?: boolean;
}

export interface ServiceSource {
  type: 'GIT' | 'DOCKER_IMAGE';
  repositoryUrl?: string;
  branch?: string;
  image?: string;
}

export interface DesiredState {
  source: ServiceSource;
  resources: ResourceAllocation;
  env: ServiceEnvVar[];
  ports?: number[];
}

export interface ObservedState {
  status: DeploymentStatus;
  activeDeploymentId?: string;
  lastCheckedAt?: Date;
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  infrastructureMode: InfrastructureMode;
  createdAt: Date;
}

export interface Service {
  id: string;
  projectId: string;
  organizationId: string;
  name: string;
  slug: string;
  runtimeTemplateId: string;
  desiredState: DesiredState;
  observedState: ObservedState;
  createdAt: Date;
}

export interface CreateProjectInput {
  organizationId: string;
  name: string;
  infrastructureMode: InfrastructureMode;
}

export interface CreateServiceInput {
  projectId: string;
  organizationId: string;
  name: string;
  runtimeTemplateId: string;
  source: ServiceSource;
  resources: ResourceAllocation;
  env?: ServiceEnvVar[];
  ports?: number[];
}

export class InvalidSlugError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSlugError';
  }
}

export class InvalidResourceRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidResourceRequestError';
  }
}

export class SecretLeakViolationError extends Error {
  constructor(key: string) {
    super(`Environment variable '${key}' is marked as secret but contains plain-text value instead of secretRef.`);
    this.name = 'SecretLeakViolationError';
  }
}

export class RuntimeCatalog {
  private static readonly templates: RuntimeTemplate[] = [
    {
      id: 'php-wordpress',
      name: 'WordPress on PHP 8.2 / MariaDB',
      targetEngine: 'HESTIA',
      defaultPorts: [80, 443],
      defaultCpuMilli: 500,
      defaultMemoryMb: 512,
    },
    {
      id: 'php-laravel',
      name: 'Laravel PHP 8.3 / MariaDB',
      targetEngine: 'HESTIA',
      defaultPorts: [80, 443],
      defaultCpuMilli: 500,
      defaultMemoryMb: 512,
    },
    {
      id: 'nodejs-20',
      name: 'Node.js 20 LTS (Next.js / Express / NestJS)',
      targetEngine: 'DOKPLOY',
      defaultPorts: [3000],
      defaultCpuMilli: 500,
      defaultMemoryMb: 512,
    },
    {
      id: 'python-312',
      name: 'Python 3.12 (FastAPI / Django)',
      targetEngine: 'DOKPLOY',
      defaultPorts: [8000],
      defaultCpuMilli: 500,
      defaultMemoryMb: 512,
    },
    {
      id: 'custom-dockerfile',
      name: 'Custom Docker Container',
      targetEngine: 'DOKPLOY',
      defaultPorts: [8080],
      defaultCpuMilli: 1000,
      defaultMemoryMb: 1024,
    },
  ];

  static listAvailableTemplates(): RuntimeTemplate[] {
    return [...this.templates];
  }

  static getTemplateById(id: string): RuntimeTemplate | undefined {
    return this.templates.find((t) => t.id === id);
  }
}

export class ProjectServiceManager {
  private static slugify(text: string): string {
    const slug = text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!slug || slug.length === 0) {
      throw new InvalidSlugError(`Invalid name: cannot generate a valid slug from '${text}'`);
    }

    return slug;
  }

  static createProject(input: CreateProjectInput): Project {
    const slug = this.slugify(input.name);

    return {
      id: `proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      organizationId: input.organizationId,
      name: input.name.trim(),
      slug,
      infrastructureMode: input.infrastructureMode,
      createdAt: new Date(),
    };
  }

  static createService(input: CreateServiceInput): Service {
    const slug = this.slugify(input.name);

    if (input.resources.cpuMilli <= 0 || input.resources.memoryMb <= 0) {
      throw new InvalidResourceRequestError('CPU and memory allocations must be strictly positive numbers.');
    }

    if (input.env) {
      for (const envVar of input.env) {
        if (envVar.isSecret && envVar.value && !envVar.secretRef) {
          throw new SecretLeakViolationError(envVar.key);
        }
      }
    }

    return {
      id: `svc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      projectId: input.projectId,
      organizationId: input.organizationId,
      name: input.name.trim(),
      slug,
      runtimeTemplateId: input.runtimeTemplateId,
      desiredState: {
        source: input.source,
        resources: input.resources,
        env: input.env || [],
        ports: input.ports,
      },
      observedState: {
        status: 'PENDING',
      },
      createdAt: new Date(),
    };
  }
}

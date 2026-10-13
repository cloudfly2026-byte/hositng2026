import { describe, it, expect } from 'vitest';
import {
  RuntimeCatalog,
  ProjectServiceManager,
  CreateProjectInput,
  CreateServiceInput,
  InvalidResourceRequestError,
  InvalidSlugError,
  SecretLeakViolationError,
} from './project-service';

describe('Epic A3 - Projects, Services, and Runtime Catalog', () => {
  const orgId = 'org-100';

  it('provides a runtime catalog with standard runtimes for Hestia and Dokploy', () => {
    const catalog = RuntimeCatalog.listAvailableTemplates();
    expect(catalog.length).toBeGreaterThanOrEqual(3);

    const wpTemplate = RuntimeCatalog.getTemplateById('php-wordpress');
    expect(wpTemplate).toBeDefined();
    expect(wpTemplate?.targetEngine).toBe('HESTIA');

    const nodeTemplate = RuntimeCatalog.getTemplateById('nodejs-20');
    expect(nodeTemplate).toBeDefined();
    expect(nodeTemplate?.targetEngine).toBe('DOKPLOY');
  });

  it('creates a project with valid parameters and slug validation', () => {
    const projectInput: CreateProjectInput = {
      organizationId: orgId,
      name: 'My eCommerce Store',
      infrastructureMode: 'SHARED',
    };

    const project = ProjectServiceManager.createProject(projectInput);
    expect(project.id).toBeDefined();
    expect(project.organizationId).toBe(orgId);
    expect(project.slug).toBe('my-ecommerce-store');
    expect(project.infrastructureMode).toBe('SHARED');
  });

  it('fails to create a project with an invalid slug/name', () => {
    expect(() => {
      ProjectServiceManager.createProject({
        organizationId: orgId,
        name: '   ',
        infrastructureMode: 'SHARED',
      });
    }).toThrow(InvalidSlugError);
  });

  it('creates a service linked to project and organization with declarative desired state', () => {
    const project = ProjectServiceManager.createProject({
      organizationId: orgId,
      name: 'Backend API',
      infrastructureMode: 'SHARED',
    });

    const serviceInput: CreateServiceInput = {
      projectId: project.id,
      organizationId: orgId,
      name: 'Order Service',
      runtimeTemplateId: 'nodejs-20',
      source: {
        type: 'GIT',
        repositoryUrl: 'https://github.com/myorg/order-service.git',
        branch: 'main',
      },
      resources: {
        cpuMilli: 500,
        memoryMb: 512,
      },
      env: [
        { key: 'PORT', value: '3000', isSecret: false },
        { key: 'DB_PASSWORD', secretRef: 'sec-db-pass-123', isSecret: true },
      ],
    };

    const service = ProjectServiceManager.createService(serviceInput);
    expect(service.id).toBeDefined();
    expect(service.projectId).toBe(project.id);
    expect(service.organizationId).toBe(orgId);
    expect(service.slug).toBe('order-service');
    expect(service.observedState.status).toBe('PENDING');
  });

  it('rejects invalid resource allocations (e.g. non-positive CPU or RAM)', () => {
    const project = ProjectServiceManager.createProject({
      organizationId: orgId,
      name: 'Test App',
      infrastructureMode: 'SHARED',
    });

    expect(() => {
      ProjectServiceManager.createService({
        projectId: project.id,
        organizationId: orgId,
        name: 'Faulty Service',
        runtimeTemplateId: 'nodejs-20',
        source: {
          type: 'DOCKER_IMAGE',
          image: 'nginx:alpine',
        },
        resources: {
          cpuMilli: -100, // Invalid
          memoryMb: 256,
        },
      });
    }).toThrow(InvalidResourceRequestError);
  });

  it('prevents raw plain-text secrets in environment variables when marked as sensitive', () => {
    const project = ProjectServiceManager.createProject({
      organizationId: orgId,
      name: 'Secure App',
      infrastructureMode: 'SHARED',
    });

    expect(() => {
      ProjectServiceManager.createService({
        projectId: project.id,
        organizationId: orgId,
        name: 'Leaky Service',
        runtimeTemplateId: 'nodejs-20',
        source: {
          type: 'DOCKER_IMAGE',
          image: 'redis:latest',
        },
        resources: {
          cpuMilli: 250,
          memoryMb: 256,
        },
        env: [
          // Plain text password instead of secretRef
          { key: 'API_SECRET', value: 'my-super-secret-password-123', isSecret: true },
        ],
      });
    }).toThrow(SecretLeakViolationError);
  });
});

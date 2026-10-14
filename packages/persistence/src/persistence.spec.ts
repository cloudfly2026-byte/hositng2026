import { describe, it, expect, beforeEach } from 'vitest';
import {
  CustomerUser,
  CustomerOrganization,
  Order,
  OrderStatus,
  BillingCycle,
  ProductCategory,
  InfrastructureMode,
  Role,
  EntitlementStatus,
  Project,
  Service,
  IUnitOfWork,
} from '@cloudfly/domain';
import {
  PrismaUserRepository,
  PrismaOrganizationRepository,
  PrismaMembershipRepository,
  PrismaPlanVersionRepository,
  PrismaOrderRepository,
  PrismaCustomerEntitlementRepository,
  PrismaProjectRepository,
  PrismaServiceRepository,
  createTestUnitOfWork,
} from './index';

describe('Persistence Layer & Multi-Tenant Isolation (TDD)', () => {
  let uow: IUnitOfWork;

  beforeEach(() => {
    uow = createTestUnitOfWork();
  });

  describe('Multi-Tenant Isolation', () => {
    it('should strictly isolate projects between different organizations', async () => {
      const orgA: CustomerOrganization = {
        id: 'org-tenant-a',
        name: 'Tenant Alpha',
        slug: 'tenant-alpha',
        ownerUserId: 'usr-1',
        createdAt: new Date(),
      };
      const orgB: CustomerOrganization = {
        id: 'org-tenant-b',
        name: 'Tenant Beta',
        slug: 'tenant-beta',
        ownerUserId: 'usr-2',
        createdAt: new Date(),
      };

      await uow.organizations.save(orgA);
      await uow.organizations.save(orgB);

      const projectA: Project = {
        id: 'prj-alpha-web',
        organizationId: orgA.id,
        name: 'Alpha Web',
        slug: 'web-app',
        infrastructureMode: 'SHARED_POOL' as InfrastructureMode,
        createdAt: new Date(),
      };

      const projectB: Project = {
        id: 'prj-beta-web',
        organizationId: orgB.id,
        name: 'Beta Web',
        slug: 'web-app', // Same slug allowed across different tenants
        infrastructureMode: 'SHARED_POOL' as InfrastructureMode,
        createdAt: new Date(),
      };

      await uow.projects.save(projectA);
      await uow.projects.save(projectB);

      const orgAProjects = await uow.projects.listByOrganization(orgA.id);
      const orgBProjects = await uow.projects.listByOrganization(orgB.id);

      expect(orgAProjects).toHaveLength(1);
      expect(orgAProjects[0].id).toBe('prj-alpha-web');

      expect(orgBProjects).toHaveLength(1);
      expect(orgBProjects[0].id).toBe('prj-beta-web');

      // Verify cross-tenant isolation
      expect(orgAProjects.some((p) => p.organizationId === orgB.id)).toBe(false);
      expect(orgBProjects.some((p) => p.organizationId === orgA.id)).toBe(false);
    });

    it('should prevent cross-tenant service access', async () => {
      const serviceA: Service = {
        id: 'srv-alpha-api',
        projectId: 'prj-alpha-web',
        organizationId: 'org-tenant-a',
        name: 'API Service',
        slug: 'api',
        runtimeTemplateId: 'tpl-node-22',
        desiredState: {
          source: { type: 'GIT', repositoryUrl: 'https://github.com/alpha/api' },
          resources: { cpuMilli: 500, memoryMb: 1024 },
          env: [],
        },
        observedState: { status: 'HEALTHY' as any },
        createdAt: new Date(),
      };

      const serviceB: Service = {
        id: 'srv-beta-api',
        projectId: 'prj-beta-web',
        organizationId: 'org-tenant-b',
        name: 'Beta API Service',
        slug: 'api',
        runtimeTemplateId: 'tpl-python-312',
        desiredState: {
          source: { type: 'DOCKER_IMAGE', image: 'python:3.12' },
          resources: { cpuMilli: 250, memoryMb: 512 },
          env: [],
        },
        observedState: { status: 'HEALTHY' as any },
        createdAt: new Date(),
      };

      await uow.services.save(serviceA);
      await uow.services.save(serviceB);

      const servicesOrgA = await uow.services.listByOrganization('org-tenant-a');
      expect(servicesOrgA).toHaveLength(1);
      expect(servicesOrgA[0].id).toBe('srv-alpha-api');
    });
  });

  describe('Uniqueness Constraints & Conflict Detection', () => {
    it('should reject duplicate user emails', async () => {
      const user1: CustomerUser = {
        id: 'usr-1',
        email: 'founder@velupi.com',
        fullName: 'Founder Velupi',
        emailVerified: true,
        createdAt: new Date(),
      };

      const user2: CustomerUser = {
        id: 'usr-2',
        email: 'founder@velupi.com', // Duplicate
        fullName: 'Impostor',
        emailVerified: false,
        createdAt: new Date(),
      };

      await uow.users.save(user1);
      await expect(uow.users.save(user2)).rejects.toThrow(/already exists|unique|duplicate/i);
    });

    it('should reject duplicate organization slugs', async () => {
      const org1: CustomerOrganization = {
        id: 'org-1',
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerUserId: 'usr-1',
        createdAt: new Date(),
      };

      const org2: CustomerOrganization = {
        id: 'org-2',
        name: 'Acme Duplicate',
        slug: 'acme-corp',
        ownerUserId: 'usr-2',
        createdAt: new Date(),
      };

      await uow.organizations.save(org1);
      await expect(uow.organizations.save(org2)).rejects.toThrow(/already exists|unique|duplicate/i);
    });

    it('should reject duplicate order idempotency keys', async () => {
      const order1: Order = {
        id: 'ord-1',
        organizationId: 'org-1',
        orderNumber: 'ORD-1001',
        status: OrderStatus.PENDING_PAYMENT,
        currency: 'COP',
        subtotalCents: 100000,
        taxCents: 19000,
        totalCents: 119000,
        items: [],
        idempotencyKey: 'idem-key-abc-123',
        createdAt: new Date(),
      };

      const order2: Order = {
        id: 'ord-2',
        organizationId: 'org-1',
        orderNumber: 'ORD-1002',
        status: OrderStatus.PENDING_PAYMENT,
        currency: 'COP',
        subtotalCents: 100000,
        taxCents: 19000,
        totalCents: 119000,
        items: [],
        idempotencyKey: 'idem-key-abc-123', // Same idempotency key
        createdAt: new Date(),
      };

      await uow.orders.save(order1);
      await expect(uow.orders.save(order2)).rejects.toThrow(/already exists|unique|duplicate|idempotency/i);
    });

    it('should reject duplicate project slug within the same organization', async () => {
      const p1: Project = {
        id: 'prj-1',
        organizationId: 'org-tenant-a',
        name: 'Project 1',
        slug: 'backend',
        infrastructureMode: 'SHARED_POOL' as InfrastructureMode,
        createdAt: new Date(),
      };

      const p2: Project = {
        id: 'prj-2',
        organizationId: 'org-tenant-a', // Same org
        name: 'Project 2',
        slug: 'backend', // Same slug in same org
        infrastructureMode: 'SHARED_POOL' as InfrastructureMode,
        createdAt: new Date(),
      };

      await uow.projects.save(p1);
      await expect(uow.projects.save(p2)).rejects.toThrow(/already exists|unique|duplicate/i);
    });
  });

  describe('Durability & Persistence Across Process Restart', () => {
    it('should retrieve persisted entities after creating a fresh repository instance', async () => {
      // Step 1: Save data using initial unit of work
      const user: CustomerUser = {
        id: 'usr-persisted-99',
        email: 'persisted@velupi.com',
        fullName: 'Persisted User',
        emailVerified: true,
        createdAt: new Date(),
      };
      await uow.users.save(user);

      const order: Order = {
        id: 'ord-persisted-99',
        organizationId: 'org-tenant-a',
        orderNumber: 'ORD-9999',
        status: OrderStatus.PAID,
        currency: 'COP',
        subtotalCents: 50000,
        taxCents: 9500,
        totalCents: 59500,
        items: [
          {
            id: 'item-1',
            orderId: 'ord-persisted-99',
            planVersionId: 'ver-shared-01',
            billingCycle: BillingCycle.MONTHLY,
            unitPriceCents: 50000,
            quantity: 1,
          },
        ],
        idempotencyKey: 'idem-persisted-99',
        createdAt: new Date(),
      };
      await uow.orders.save(order);

      // Step 2: Simulate process restart by creating a new repository instance pointing to the same backing store
      const freshUow = (uow as any).cloneForNewProcess();

      // Step 3: Query using the fresh instance
      const fetchedUser = await freshUow.users.findById('usr-persisted-99');
      const fetchedOrder = await freshUow.orders.findById('ord-persisted-99');

      expect(fetchedUser).not.toBeNull();
      expect(fetchedUser?.email).toBe('persisted@velupi.com');

      expect(fetchedOrder).not.toBeNull();
      expect(fetchedOrder?.orderNumber).toBe('ORD-9999');
      expect(fetchedOrder?.status).toBe(OrderStatus.PAID);
      expect(fetchedOrder?.items).toHaveLength(1);
    });
  });

  describe('Transactional Atomicity & Unit of Work', () => {
    it('should rollback all operations if an error occurs within transaction block', async () => {
      try {
        await uow.transaction(async (txUow) => {
          await txUow.users.save({
            id: 'usr-tx-1',
            email: 'tx@velupi.com',
            fullName: 'Transaction User',
            emailVerified: true,
            createdAt: new Date(),
          });

          // Simulate failure
          throw new Error('Transaction aborted midway');
        });
      } catch (err) {
        // Expected error
      }

      const user = await uow.users.findById('usr-tx-1');
      expect(user).toBeNull();
    });
  });
});

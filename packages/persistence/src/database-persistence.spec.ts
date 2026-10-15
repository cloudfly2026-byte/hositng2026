import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CustomerUser,
  CustomerOrganization,
  Order,
  OrderStatus,
  BillingCycle,
  CustomerEntitlement,
  EntitlementStatus,
  Project,
  Service,
  InfrastructureMode,
} from '@cloudfly/domain';
import { PrismaDatabaseUnitOfWork } from './repositories/prisma-database-uow';

describe('PrismaDatabaseUnitOfWork (Relational PostgreSQL Adapter)', () => {
  let mockPrisma: any;
  let uow: PrismaDatabaseUnitOfWork;

  beforeEach(() => {
    mockPrisma = {
      user: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        delete: vi.fn(),
      },
      organization: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      membership: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        delete: vi.fn(),
      },
      product: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      plan: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
      },
      planVersion: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
      },
      order: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      customerEntitlement: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      project: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      service: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      $transaction: vi.fn((fn: any) => fn(mockPrisma)),
    };

    uow = new PrismaDatabaseUnitOfWork(mockPrisma);
  });

  describe('User & Organization Persistence', () => {
    it('persists and retrieves customer users via PrismaClient', async () => {
      const user: CustomerUser = {
        id: 'usr-db-1',
        email: 'admin@velupi.com',
        fullName: 'Velupi Admin',
        emailVerified: true,
        createdAt: new Date(),
      };

      await uow.users.save(user);
      expect(mockPrisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'usr-db-1' },
          create: expect.objectContaining({ email: 'admin@velupi.com' }),
        })
      );

      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'usr-db-1',
        email: 'admin@velupi.com',
        fullName: 'Velupi Admin',
        emailVerified: true,
        createdAt: user.createdAt,
      });

      const found = await uow.users.findById('usr-db-1');
      expect(found).not.toBeNull();
      expect(found?.email).toBe('admin@velupi.com');
    });

    it('persists organizations and retrieves by slug via PrismaClient', async () => {
      const org: CustomerOrganization = {
        id: 'org-db-1',
        name: 'Velupi Internal',
        slug: 'velupi-internal',
        ownerUserId: 'usr-db-1',
        isInternalPilot: true,
        createdAt: new Date(),
      };

      await uow.organizations.save(org);
      expect(mockPrisma.organization.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'org-db-1' },
          create: expect.objectContaining({ slug: 'velupi-internal' }),
        })
      );

      mockPrisma.organization.findUnique.mockResolvedValueOnce({
        id: 'org-db-1',
        name: 'Velupi Internal',
        slug: 'velupi-internal',
        ownerUserId: 'usr-db-1',
        isInternalPilot: true,
        createdAt: org.createdAt,
      });

      const found = await uow.organizations.findBySlug('velupi-internal');
      expect(found?.slug).toBe('velupi-internal');
      expect(found?.isInternalPilot).toBe(true);
    });
  });

  describe('Orders and Entitlements Persistence', () => {
    it('saves order and related line items to Prisma', async () => {
      const order: Order = {
        id: 'ord-db-1',
        organizationId: 'org-db-1',
        orderNumber: 'VEL-2026-001',
        status: OrderStatus.PAID,
        currency: 'COP',
        subtotalCents: 5000000,
        taxCents: 950000,
        totalCents: 5950000,
        items: [
          {
            id: 'item-db-1',
            orderId: 'ord-db-1',
            planVersionId: 'pv-db-1',
            billingCycle: BillingCycle.MONTHLY,
            unitPriceCents: 5000000,
            quantity: 1,
          },
        ],
        idempotencyKey: 'idem-db-1',
        createdAt: new Date(),
      };

      await uow.orders.save(order);
      expect(mockPrisma.order.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ord-db-1' },
          create: expect.objectContaining({
            orderNumber: 'VEL-2026-001',
            status: OrderStatus.PAID,
            items: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({ id: 'item-db-1' }),
              ]),
            }),
          }),
        })
      );
    });

    it('saves CustomerEntitlement and executes transactions with atomicity', async () => {
      const ent: CustomerEntitlement = {
        id: 'ent-db-1',
        organizationId: 'org-db-1',
        orderId: 'ord-db-1',
        planVersionId: 'pv-db-1',
        status: EntitlementStatus.ACTIVE,
        quotas: {
          cpuMilli: 1000,
          memoryMb: 2048,
          diskMb: 20480,
          bandwidthMb: 100000,
          maxApps: 5,
          maxDomains: 5,
          maxDatabases: 5,
          hermesAccess: true,
        },
        validUntil: new Date(Date.now() + 86400000 * 365),
        createdAt: new Date(),
      };

      await uow.entitlements.save(ent);
      expect(mockPrisma.customerEntitlement.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ent-db-1' },
          create: expect.objectContaining({
            status: EntitlementStatus.ACTIVE,
          }),
        })
      );

      const result = await uow.transaction(async (tx) => {
        await tx.users.delete('usr-db-1');
        return 'transaction-committed';
      });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toBe('transaction-committed');
    });
  });
});

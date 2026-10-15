import { describe, it, expect } from 'vitest';
import {
  ProvisioningOrchestrator,
  ProvisioningJobStatus,
  EntitlementStatus,
  InvalidOrderForProvisioningError,
} from './provisioning-orchestrator';
import { Order, OrderStatus } from './onboarding-order';
import { ProductCatalogService, ProductCategory, BillingCycle } from './catalog';

describe('Epic COM-07 & COM-09 - Provisioning Orchestrator & Velupi Pilot #001', () => {
  const catalog = new ProductCatalogService();
  const wpProduct = catalog.createProduct({
    name: 'Velupi WordPress',
    code: 'velupi-wp',
    category: ProductCategory.WORDPRESS,
  });

  const wpPlan = catalog.createPlan({
    productId: wpProduct.id,
    name: 'WordPress Shared',
    code: 'wp-shared-01',
    infrastructureMode: 'SHARED',
  });

  const wpVersion = catalog.publishPlanVersion({
    planId: wpPlan.id,
    version: 1,
    quotas: {
      cpuMilli: 500,
      memoryMb: 512,
      diskMb: 10240,
      bandwidthMb: 50000,
      maxApps: 1,
      maxDomains: 1,
      maxDatabases: 1,
      hermesAccess: false,
    },
    prices: [{ currency: 'COP', billingCycle: BillingCycle.MONTHLY, priceCents: 3500000 }],
    effectiveFrom: new Date('2026-01-01'),
  });

  describe('COM-07: Provisioning Orchestrator', () => {
    it('dispatches a ProvisioningJob and creates CustomerEntitlement when order is PAID', () => {
      const orchestrator = new ProvisioningOrchestrator(catalog);

      const paidOrder: Order = {
        id: 'ord-paid-777',
        organizationId: 'org-client-1',
        orderNumber: 'VEL-777001',
        status: OrderStatus.PAID,
        currency: 'COP',
        subtotalCents: 3500000,
        taxCents: 665000,
        totalCents: 4165000,
        items: [
          {
            id: 'item-1',
            orderId: 'ord-paid-777',
            planVersionId: wpVersion.id,
            billingCycle: BillingCycle.MONTHLY,
            unitPriceCents: 3500000,
            quantity: 1,
          },
        ],
        idempotencyKey: 'idem-paid-777',
        createdAt: new Date(),
      };

      const result = orchestrator.orchestratePaidOrder(paidOrder);

      expect(result.entitlement.id).toBeDefined();
      expect(result.entitlement.organizationId).toBe('org-client-1');
      expect(result.entitlement.status).toBe(EntitlementStatus.ACTIVE);
      expect(result.entitlement.quotas.diskMb).toBe(10240);

      expect(result.job.id).toBeDefined();
      expect(result.job.orderId).toBe(paidOrder.id);
      expect(result.job.status).toBe(ProvisioningJobStatus.QUEUED);
      expect(result.job.targetEngine).toBe('HESTIA');
    });

    it('rejects dispatching provisioning if the order is not in PAID status', () => {
      const orchestrator = new ProvisioningOrchestrator(catalog);

      const pendingOrder: Order = {
        id: 'ord-pending-888',
        organizationId: 'org-client-2',
        orderNumber: 'VEL-888001',
        status: OrderStatus.PENDING_PAYMENT, // Not paid!
        currency: 'COP',
        subtotalCents: 3500000,
        taxCents: 665000,
        totalCents: 4165000,
        items: [
          {
            id: 'item-1',
            orderId: 'ord-pending-888',
            planVersionId: wpVersion.id,
            billingCycle: BillingCycle.MONTHLY,
            unitPriceCents: 3500000,
            quantity: 1,
          },
        ],
        idempotencyKey: 'idem-pending-888',
        createdAt: new Date(),
      };

      expect(() => {
        orchestrator.orchestratePaidOrder(pendingOrder);
      }).toThrow(InvalidOrderForProvisioningError);
    });

    it('guarantees idempotency: re-dispatching same order returns existing job without duplicates', () => {
      const orchestrator = new ProvisioningOrchestrator(catalog);

      const paidOrder: Order = {
        id: 'ord-paid-999',
        organizationId: 'org-client-3',
        orderNumber: 'VEL-999001',
        status: OrderStatus.PAID,
        currency: 'COP',
        subtotalCents: 3500000,
        taxCents: 665000,
        totalCents: 4165000,
        items: [
          {
            id: 'item-1',
            orderId: 'ord-paid-999',
            planVersionId: wpVersion.id,
            billingCycle: BillingCycle.MONTHLY,
            unitPriceCents: 3500000,
            quantity: 1,
          },
        ],
        idempotencyKey: 'idem-paid-999',
        createdAt: new Date(),
      };

      const run1 = orchestrator.orchestratePaidOrder(paidOrder);
      const run2 = orchestrator.orchestratePaidOrder(paidOrder);

      expect(run1.job.id).toBe(run2.job.id);
      expect(orchestrator.getJobCount()).toBe(1);
    });
  });

  describe('COM-09: Pilot Customer #001 (Velupi Internal Organization)', () => {
    it('provisions the Velupi pilot with an authorized zero-cost internal order and Hestia target engine', () => {
      const orchestrator = new ProvisioningOrchestrator(catalog);

      const internalPilotOrder: Order = {
        id: 'ord-velupi-internal-001',
        organizationId: 'org-velupi-internal',
        orderNumber: 'VEL-INTERNAL-001',
        status: OrderStatus.PAID, // Internal authorized
        currency: 'COP',
        subtotalCents: 0,
        taxCents: 0,
        totalCents: 0,
        items: [
          {
            id: 'item-pilot-1',
            orderId: 'ord-velupi-internal-001',
            planVersionId: wpVersion.id,
            billingCycle: BillingCycle.ANNUAL,
            unitPriceCents: 0,
            quantity: 1,
          },
        ],
        idempotencyKey: 'idem-pilot-001',
        createdAt: new Date(),
      };

      const result = orchestrator.orchestratePaidOrder(internalPilotOrder, {
        primaryDomain: 'velupi.com',
        isInternalPilot: true,
      });

      expect(result.entitlement.organizationId).toBe('org-velupi-internal');
      expect(result.entitlement.status).toBe(EntitlementStatus.ACTIVE);
      expect(result.job.targetEngine).toBe('HESTIA');
      expect(result.job.metadata?.primaryDomain).toBe('velupi.com');
      expect(result.job.metadata?.isInternalPilot).toBe(true);
    });

    it('persists created CustomerEntitlement to IUnitOfWork when provided', async () => {
      const savedEntitlements: any[] = [];
      const mockUow: any = {
        entitlements: {
          save: async (ent: any) => {
            savedEntitlements.push({ ...ent });
          },
          findById: async (id: string) => savedEntitlements.find((e) => e.id === id) || null,
          listByOrganization: async (orgId: string) =>
            savedEntitlements.filter((e) => e.organizationId === orgId),
        },
      };

      const orchestrator = new ProvisioningOrchestrator(catalog, mockUow);
      const paidOrder: Order = {
        id: 'ord-uow-ent-1',
        organizationId: 'org-client-uow',
        orderNumber: 'VEL-UOW-001',
        status: OrderStatus.PAID,
        currency: 'COP',
        subtotalCents: 3500000,
        taxCents: 665000,
        totalCents: 4165000,
        items: [
          {
            id: 'item-1',
            orderId: 'ord-uow-ent-1',
            planVersionId: wpVersion.id,
            billingCycle: BillingCycle.MONTHLY,
            unitPriceCents: 3500000,
            quantity: 1,
          },
        ],
        idempotencyKey: 'idem-uow-ent-1',
        createdAt: new Date(),
      };

      const result = orchestrator.orchestratePaidOrder(paidOrder);
      expect(savedEntitlements).toHaveLength(1);
      expect(savedEntitlements[0].id).toBe(result.entitlement.id);
      expect(savedEntitlements[0].organizationId).toBe('org-client-uow');
    });
  });
});


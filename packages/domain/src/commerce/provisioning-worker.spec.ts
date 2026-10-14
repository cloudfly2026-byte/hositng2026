import { describe, it, expect, beforeEach } from 'vitest';
import {
  ProvisioningOrchestrator,
  ProvisioningJobStatus,
  EntitlementStatus,
} from './provisioning-orchestrator';
import {
  ProvisioningWorkerService,
  ProvisioningEngineAdapter,
} from './provisioning-worker';
import { ProductCatalogService, BillingCycle, ProductCategory } from './catalog';
import { Order, OrderStatus } from './onboarding-order';

class MockEngineAdapter implements ProvisioningEngineAdapter {
  provisionCalls: string[] = [];
  rollbackCalls: string[] = [];
  shouldFailOnStep?: string;

  async provision(job: any): Promise<{ success: boolean; output: string }> {
    if (this.shouldFailOnStep === 'PROVISIONING') {
      throw new Error('Infrastructure provision failed (e.g. host unreachable)');
    }
    this.provisionCalls.push(job.id);
    return { success: true, output: 'Node provisioned' };
  }

  async rollback(job: any): Promise<void> {
    this.rollbackCalls.push(job.id);
  }
}

describe('ProvisioningWorkerService (TDD)', () => {
  let catalog: ProductCatalogService;
  let orchestrator: ProvisioningOrchestrator;
  let engine: MockEngineAdapter;
  let worker: ProvisioningWorkerService;

  let validOrder: Order;

  beforeEach(() => {
    catalog = new ProductCatalogService();
    const product = catalog.createProduct({
      name: 'Velupi Web Hosting',
      code: 'velupi-shared',
      category: ProductCategory.WEB_HOSTING,
    });
    const plan = catalog.createPlan({
      productId: product.id,
      name: 'Starter Cloud',
      code: 'starter-v1',
      infrastructureMode: 'SHARED',
    });
    const version = catalog.publishPlanVersion({
      planId: plan.id,
      version: '1.0.0',
      features: ['PHP 8.2', 'SSL Free'],
      effectiveFrom: new Date(),
      prices: [{ currency: 'COP', billingCycle: BillingCycle.MONTHLY, priceCents: 4900000 }],
      quotas: {
        cpuMilli: 1000,
        memoryMb: 1024,
        diskMb: 10000,
        bandwidthMb: 100000,
        maxApps: 5,
        maxDomains: 2,
        maxDatabases: 2,
        hermesAccess: false,
      },
    });


    validOrder = {
      id: 'ord-100',
      organizationId: 'org-tenant-1',
      orderNumber: 'ORD-100',
      status: OrderStatus.PAID,
      currency: 'COP',
      subtotalCents: 4900000,
      taxCents: 0,
      totalCents: 4900000,
      items: [
        {
          id: 'item-1',
          orderId: 'ord-100',
          planVersionId: version.id,
          billingCycle: BillingCycle.MONTHLY,
          unitPriceCents: 4900000,
          quantity: 1,
        },
      ],
      idempotencyKey: 'idem-100',
      createdAt: new Date(),
    };

    orchestrator = new ProvisioningOrchestrator(catalog);
    engine = new MockEngineAdapter();
    worker = new ProvisioningWorkerService(engine);
  });


  it('should successfully execute all provisioning steps to ACTIVE state', async () => {
    const { job, entitlement } = orchestrator.orchestratePaidOrder(validOrder, {
      primaryDomain: 'client.com',
    });

    expect(job.status).toBe(ProvisioningJobStatus.QUEUED);
    expect(entitlement.status).toBe(EntitlementStatus.ACTIVE);

    const processedJob = await worker.processJob(job);

    expect(processedJob.status).toBe(ProvisioningJobStatus.ACTIVE);
    expect(processedJob.stepHistory).toEqual([
      ProvisioningJobStatus.QUEUED,
      ProvisioningJobStatus.VALIDATING,
      ProvisioningJobStatus.ALLOCATING,
      ProvisioningJobStatus.PROVISIONING,
      ProvisioningJobStatus.CONFIGURING,
      ProvisioningJobStatus.VERIFYING,
      ProvisioningJobStatus.ACTIVE,
    ]);
    expect(engine.provisionCalls).toContain(job.id);
  });

  it('should trigger rollback compensation and mark job as FAILED when provision step fails', async () => {
    engine.shouldFailOnStep = 'PROVISIONING';

    const { job } = orchestrator.orchestratePaidOrder(validOrder, {
      primaryDomain: 'failure-test.com',
    });

    const failedJob = await worker.processJob(job);

    expect(failedJob.status).toBe(ProvisioningJobStatus.FAILED);
    expect(failedJob.errorLog).toContain('Infrastructure provision failed');
    expect(engine.rollbackCalls).toContain(job.id);
    expect(failedJob.stepHistory).toContain(ProvisioningJobStatus.ROLLBACK_REQUIRED);
  });

  it('should allow retrying a failed job when transient error is resolved', async () => {
    engine.shouldFailOnStep = 'PROVISIONING';

    const { job } = orchestrator.orchestratePaidOrder(validOrder);
    const failedJob = await worker.processJob(job);
    expect(failedJob.status).toBe(ProvisioningJobStatus.FAILED);

    // Resolve transient error and retry
    engine.shouldFailOnStep = undefined;
    const retriedJob = await worker.retryJob(failedJob.id);

    expect(retriedJob.status).toBe(ProvisioningJobStatus.ACTIVE);
    expect(retriedJob.attempts).toBe(2);
  });
});

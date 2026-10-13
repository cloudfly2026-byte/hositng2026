import { TargetEngine } from '../projects/project-service';
import { ProductCatalogService, ProductCategory, ResourceQuota } from './catalog';
import { Order, OrderStatus } from './onboarding-order';

export enum EntitlementStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  EXPIRED = 'EXPIRED',
}

export interface CustomerEntitlement {
  id: string;
  organizationId: string;
  orderId: string;
  planVersionId: string;
  status: EntitlementStatus;
  quotas: ResourceQuota;
  validUntil: Date;
  createdAt: Date;
}

export enum ProvisioningJobStatus {
  QUEUED = 'QUEUED',
  VALIDATING = 'VALIDATING',
  ALLOCATING = 'ALLOCATING',
  PROVISIONING = 'PROVISIONING',
  CONFIGURING = 'CONFIGURING',
  VERIFYING = 'VERIFYING',
  ACTIVE = 'ACTIVE',
  FAILED = 'FAILED',
  ROLLBACK_REQUIRED = 'ROLLBACK_REQUIRED',
}

export interface ProvisioningJob {
  id: string;
  orderId: string;
  entitlementId: string;
  organizationId: string;
  targetEngine: TargetEngine;
  status: ProvisioningJobStatus;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface OrchestrateOptions {
  primaryDomain?: string;
  isInternalPilot?: boolean;
}

export interface OrchestrationResult {
  entitlement: CustomerEntitlement;
  job: ProvisioningJob;
}

export class InvalidOrderForProvisioningError extends Error {
  constructor(orderId: string, status: OrderStatus) {
    super(`Cannot orchestrate provisioning for order '${orderId}' because its status is '${status}'. Only PAID orders can be provisioned.`);
    this.name = 'InvalidOrderForProvisioningError';
  }
}

export class ProvisioningOrchestrator {
  private entitlements: Map<string, CustomerEntitlement> = new Map();
  private jobs: Map<string, ProvisioningJob> = new Map();
  private orderJobIndex: Map<string, ProvisioningJob> = new Map(); // orderId -> Job (Idempotency)

  constructor(private catalog: ProductCatalogService) {}

  orchestratePaidOrder(order: Order, options?: OrchestrateOptions): OrchestrationResult {
    if (order.status !== OrderStatus.PAID) {
      throw new InvalidOrderForProvisioningError(order.id, order.status);
    }

    // Idempotency: return existing job and entitlement if already dispatched
    if (this.orderJobIndex.has(order.id)) {
      const existingJob = this.orderJobIndex.get(order.id)!;
      const existingEntitlement = this.entitlements.get(existingJob.entitlementId)!;
      return {
        entitlement: existingEntitlement,
        job: existingJob,
      };
    }

    const firstItem = order.items[0];
    if (!firstItem) {
      throw new Error(`Order '${order.id}' has no items.`);
    }

    const planVersion = this.catalog.getVersionById(firstItem.planVersionId);

    // Determine target deployment engine from plan/product
    let targetEngine: TargetEngine = 'HESTIA'; // default for WordPress / PHP
    const product = this.getProductForPlan(planVersion.planId);
    if (product?.category === ProductCategory.CLOUD_APPS) {
      targetEngine = 'DOKPLOY';
    } else if (product?.category === ProductCategory.VPS) {
      targetEngine = 'CONTABO';
    }

    // 1. Create active entitlement
    const entitlementId = `ent-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 1); // 1 year default validity period

    const entitlement: CustomerEntitlement = {
      id: entitlementId,
      organizationId: order.organizationId,
      orderId: order.id,
      planVersionId: planVersion.id,
      status: EntitlementStatus.ACTIVE,
      quotas: { ...planVersion.quotas },
      validUntil,
      createdAt: new Date(),
    };
    this.entitlements.set(entitlement.id, entitlement);

    // 2. Enqueue Provisioning Job
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const job: ProvisioningJob = {
      id: jobId,
      orderId: order.id,
      entitlementId: entitlement.id,
      organizationId: order.organizationId,
      targetEngine,
      status: ProvisioningJobStatus.QUEUED,
      metadata: {
        primaryDomain: options?.primaryDomain,
        isInternalPilot: options?.isInternalPilot,
      },
      createdAt: new Date(),
    };

    this.jobs.set(job.id, job);
    this.orderJobIndex.set(order.id, job);

    return {
      entitlement,
      job,
    };
  }

  getJobCount(): number {
    return this.jobs.size;
  }

  private getProductForPlan(_planId: string): { category: ProductCategory } | undefined {
    // In memory fallback for catalog lookup
    return undefined;
  }
}

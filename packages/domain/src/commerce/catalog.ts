import { InfrastructureMode } from '@cloudfly/contracts';

export enum ProductCategory {
  WEB_HOSTING = 'WEB_HOSTING',
  WORDPRESS = 'WORDPRESS',
  CLOUD_APPS = 'CLOUD_APPS',
  VPS = 'VPS',
  MICROSERVICES = 'MICROSERVICES',
  AI = 'AI',
}

export enum BillingCycle {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  SEMI_ANNUAL = 'SEMI_ANNUAL',
  ANNUAL = 'ANNUAL',
  BIENNIAL = 'BIENNIAL',
}

export interface ResourceQuota {
  cpuMilli: number;
  memoryMb: number;
  diskMb: number;
  bandwidthMb: number;
  maxApps: number;
  maxDomains: number;
  maxDatabases: number;
  hermesAccess: boolean;
}

export interface PlanPrice {
  currency: string;
  billingCycle: BillingCycle;
  priceCents: number;
}

export interface Product {
  id: string;
  name: string;
  code: string;
  category: ProductCategory;
  isActive: boolean;
  createdAt: Date;
}

export interface Plan {
  id: string;
  productId: string;
  name: string;
  code: string;
  infrastructureMode: InfrastructureMode;
  createdAt: Date;
}

export interface PlanVersion {
  id: string;
  planId: string;
  version: number;
  quotas: ResourceQuota;
  prices: PlanPrice[];
  effectiveFrom: Date;
  effectiveTo?: Date;
  createdAt: Date;
}

export interface CreateProductInput {
  name: string;
  code: string;
  category: ProductCategory;
}

export interface CreatePlanInput {
  productId: string;
  name: string;
  code: string;
  infrastructureMode: InfrastructureMode;
}

export interface PublishPlanVersionInput {
  planId: string;
  version: number;
  quotas: ResourceQuota;
  prices: PlanPrice[];
  effectiveFrom: Date;
  effectiveTo?: Date;
}

export class PlanVersionNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlanVersionNotFoundError';
  }
}

export class PriceNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PriceNotFoundError';
  }
}

export class ProductCatalogService {
  private products: Map<string, Product> = new Map();
  private plans: Map<string, Plan> = new Map();
  private planVersions: Map<string, PlanVersion> = new Map();

  createProduct(input: CreateProductInput): Product {
    const product: Product = {
      id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: input.name,
      code: input.code,
      category: input.category,
      isActive: true,
      createdAt: new Date(),
    };
    this.products.set(product.id, product);
    return product;
  }

  getProductByCode(code: string): Product | undefined {
    return Array.from(this.products.values()).find((p) => p.code === code);
  }

  createPlan(input: CreatePlanInput): Plan {
    const plan: Plan = {
      id: `plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      productId: input.productId,
      name: input.name,
      code: input.code,
      infrastructureMode: input.infrastructureMode,
      createdAt: new Date(),
    };
    this.plans.set(plan.id, plan);
    return plan;
  }

  publishPlanVersion(input: PublishPlanVersionInput): PlanVersion {
    const version: PlanVersion = {
      id: `pv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      planId: input.planId,
      version: input.version,
      quotas: { ...input.quotas },
      prices: [...input.prices],
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo,
      createdAt: new Date(),
    };
    this.planVersions.set(version.id, version);
    return version;
  }

  getVersionById(versionId: string): PlanVersion {
    const version = this.planVersions.get(versionId);
    if (!version) {
      throw new PlanVersionNotFoundError(`Plan version '${versionId}' not found.`);
    }
    return version;
  }

  getPrice(versionId: string, currency: string, billingCycle: BillingCycle): PlanPrice {
    const version = this.getVersionById(versionId);
    const price = version.prices.find((p) => p.currency === currency && p.billingCycle === billingCycle);
    if (!price) {
      throw new PriceNotFoundError(`Price not found for version '${versionId}' in currency '${currency}' and cycle '${billingCycle}'.`);
    }
    return price;
  }

  getActiveVersionForDate(planId: string, targetDate: Date): PlanVersion {
    const versions = Array.from(this.planVersions.values())
      .filter((v) => v.planId === planId)
      .filter((v) => v.effectiveFrom <= targetDate && (!v.effectiveTo || v.effectiveTo >= targetDate))
      .sort((a, b) => b.version - a.version);

    if (versions.length === 0) {
      throw new PlanVersionNotFoundError(`No active plan version for plan '${planId}' at date '${targetDate.toISOString()}'.`);
    }

    return versions[0];
  }
}

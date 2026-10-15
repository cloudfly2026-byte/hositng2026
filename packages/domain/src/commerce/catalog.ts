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

  listPlans(): Array<Plan & { product?: Product; activeVersion?: PlanVersion }> {
    return Array.from(this.plans.values()).map((plan) => {
      const product = this.products.get(plan.productId);
      let activeVersion: PlanVersion | undefined;
      try {
        activeVersion = this.getActiveVersionForDate(plan.id, new Date());
      } catch {
        // No active version
      }
      return {
        ...plan,
        product,
        activeVersion,
      };
    });
  }

  getPlanByCode(code: string): (Plan & { product?: Product; activeVersion?: PlanVersion }) | undefined {
    const plan = Array.from(this.plans.values()).find((p) => p.code === code);
    if (!plan) return undefined;
    const product = this.products.get(plan.productId);
    let activeVersion: PlanVersion | undefined;
    try {
      activeVersion = this.getActiveVersionForDate(plan.id, new Date());
    } catch {
      // No active version
    }
    return {
      ...plan,
      product,
      activeVersion,
    };
  }

  initializeStandardCatalog(): void {
    if (this.plans.size > 0) return;

    // 1. WordPress
    const wpProduct = this.createProduct({
      name: 'WordPress Hosting',
      code: 'prod-wp',
      category: ProductCategory.WORDPRESS,
    });
    const wpPlan = this.createPlan({
      productId: wpProduct.id,
      name: 'Velupi WordPress Starter',
      code: 'wp-starter',
      infrastructureMode: 'SHARED',
    });
    this.publishPlanVersion({
      planId: wpPlan.id,
      version: 1,
      quotas: {
        cpuMilli: 1000,
        memoryMb: 2048,
        diskMb: 10240,
        bandwidthMb: 50000,
        maxApps: 1,
        maxDomains: 1,
        maxDatabases: 1,
        hermesAccess: false,
      },
      prices: [
        { currency: 'COP', billingCycle: BillingCycle.MONTHLY, priceCents: 3500000 },
        { currency: 'COP', billingCycle: BillingCycle.ANNUAL, priceCents: 35000000 },
      ],
      effectiveFrom: new Date('2026-01-01'),
    });

    // 2. Cloud Apps
    const appProduct = this.createProduct({
      name: 'Cloud Apps Docker',
      code: 'prod-cloud-apps',
      category: ProductCategory.CLOUD_APPS,
    });
    const appPlan = this.createPlan({
      productId: appProduct.id,
      name: 'Velupi Cloud Apps (Node/Python)',
      code: 'cloud-apps-pro',
      infrastructureMode: 'SHARED',
    });
    this.publishPlanVersion({
      planId: appPlan.id,
      version: 1,
      quotas: {
        cpuMilli: 2000,
        memoryMb: 4096,
        diskMb: 20480,
        bandwidthMb: 100000,
        maxApps: 5,
        maxDomains: 3,
        maxDatabases: 2,
        hermesAccess: true,
      },
      prices: [
        { currency: 'COP', billingCycle: BillingCycle.MONTHLY, priceCents: 5500000 },
        { currency: 'COP', billingCycle: BillingCycle.ANNUAL, priceCents: 55000000 },
      ],
      effectiveFrom: new Date('2026-01-01'),
    });

    // 3. Dedicated VPS
    const vpsProduct = this.createProduct({
      name: 'Dedicated VPS Cloud',
      code: 'prod-vps',
      category: ProductCategory.VPS,
    });
    const vpsPlan = this.createPlan({
      productId: vpsProduct.id,
      name: 'Velupi VPS Dedicado 4 MP',
      code: 'vps-dedicated',
      infrastructureMode: 'DEDICATED',
    });
    this.publishPlanVersion({
      planId: vpsPlan.id,
      version: 1,
      quotas: {
        cpuMilli: 4000,
        memoryMb: 16384,
        diskMb: 102400,
        bandwidthMb: 500000,
        maxApps: 20,
        maxDomains: 10,
        maxDatabases: 10,
        hermesAccess: true,
      },
      prices: [
        { currency: 'COP', billingCycle: BillingCycle.MONTHLY, priceCents: 14000000 },
        { currency: 'COP', billingCycle: BillingCycle.ANNUAL, priceCents: 140000000 },
      ],
      effectiveFrom: new Date('2026-01-01'),
    });
  }
}


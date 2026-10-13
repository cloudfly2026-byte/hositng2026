import { describe, it, expect } from 'vitest';
import {
  ProductCatalogService,
  ProductCategory,
  BillingCycle,
  PlanVersionNotFoundError,
  PriceNotFoundError,
} from './catalog';

describe('Epic COM-01 - Product Catalog & Versioned Plans', () => {
  it('creates and retrieves commercial products across allowed categories', () => {
    const catalog = new ProductCatalogService();
    const wpProduct = catalog.createProduct({
      name: 'Velupi WordPress',
      code: 'velupi-wp',
      category: ProductCategory.WORDPRESS,
    });

    expect(wpProduct.id).toBeDefined();
    expect(wpProduct.category).toBe(ProductCategory.WORDPRESS);
    expect(wpProduct.isActive).toBe(true);

    const retrieved = catalog.getProductByCode('velupi-wp');
    expect(retrieved).toEqual(wpProduct);
  });

  it('creates a commercial plan and registers versioned plans with immutable quotas', () => {
    const catalog = new ProductCatalogService();
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

    const version1 = catalog.publishPlanVersion({
      planId: plan.id,
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
      prices: [
        { currency: 'COP', billingCycle: BillingCycle.MONTHLY, priceCents: 2500000 }, // 25,000 COP
        { currency: 'COP', billingCycle: BillingCycle.ANNUAL, priceCents: 24000000 },  // 240,000 COP
        { currency: 'USD', billingCycle: BillingCycle.MONTHLY, priceCents: 600 },      // $6.00 USD
      ],
      effectiveFrom: new Date('2026-01-01'),
    });

    expect(version1.id).toBeDefined();
    expect(version1.version).toBe(1);
    expect(version1.quotas.diskMb).toBe(10240);

    const priceCop = catalog.getPrice(version1.id, 'COP', BillingCycle.MONTHLY);
    expect(priceCop.priceCents).toBe(2500000);
  });

  it('retrieves the active plan version and ensures contractual version freeze', () => {
    const catalog = new ProductCatalogService();
    const product = catalog.createProduct({
      name: 'Velupi Cloud Apps',
      code: 'cloud-apps',
      category: ProductCategory.CLOUD_APPS,
    });

    const plan = catalog.createPlan({
      productId: product.id,
      name: 'Pro App',
      code: 'pro-app',
      infrastructureMode: 'SHARED',
    });

    // Version 1 (Effective from Jan 2026 to June 2026)
    const v1 = catalog.publishPlanVersion({
      planId: plan.id,
      version: 1,
      quotas: {
        cpuMilli: 1000,
        memoryMb: 1024,
        diskMb: 20480,
        bandwidthMb: 100000,
        maxApps: 5,
        maxDomains: 5,
        maxDatabases: 5,
        hermesAccess: true,
      },
      prices: [{ currency: 'COP', billingCycle: BillingCycle.MONTHLY, priceCents: 5000000 }],
      effectiveFrom: new Date('2026-01-01'),
      effectiveTo: new Date('2026-06-30T23:59:59Z'),
    });

    // Version 2 (Effective from July 2026 onwards with increased specs)
    const v2 = catalog.publishPlanVersion({
      planId: plan.id,
      version: 2,
      quotas: {
        cpuMilli: 2000,
        memoryMb: 2048,
        diskMb: 40960,
        bandwidthMb: 200000,
        maxApps: 10,
        maxDomains: 10,
        maxDatabases: 10,
        hermesAccess: true,
      },
      prices: [{ currency: 'COP', billingCycle: BillingCycle.MONTHLY, priceCents: 6500000 }],
      effectiveFrom: new Date('2026-07-01'),
    });

    // An existing customer with v1 retains v1 quotas even when v2 exists
    const contractCustomerVersion = catalog.getVersionById(v1.id);
    expect(contractCustomerVersion.quotas.memoryMb).toBe(1024);

    // Active version for a new customer in August 2026 is v2
    const currentVersionInAugust = catalog.getActiveVersionForDate(plan.id, new Date('2026-08-01'));
    expect(currentVersionInAugust.id).toBe(v2.id);
    expect(currentVersionInAugust.quotas.memoryMb).toBe(2048);
  });

  it('throws PriceNotFoundError when an unsupported currency or cycle is requested', () => {
    const catalog = new ProductCatalogService();
    const product = catalog.createProduct({
      name: 'VPS Mini',
      code: 'vps-mini',
      category: ProductCategory.VPS,
    });

    const plan = catalog.createPlan({
      productId: product.id,
      name: 'VPS 1',
      code: 'vps-1',
      infrastructureMode: 'DEDICATED',
    });

    const v1 = catalog.publishPlanVersion({
      planId: plan.id,
      version: 1,
      quotas: {
        cpuMilli: 4000,
        memoryMb: 8192,
        diskMb: 100000,
        bandwidthMb: 1000000,
        maxApps: 50,
        maxDomains: 50,
        maxDatabases: 50,
        hermesAccess: true,
      },
      prices: [{ currency: 'COP', billingCycle: BillingCycle.MONTHLY, priceCents: 12000000 }],
      effectiveFrom: new Date('2026-01-01'),
    });

    expect(() => {
      catalog.getPrice(v1.id, 'EUR', BillingCycle.MONTHLY);
    }).toThrow(PriceNotFoundError);

    expect(() => {
      catalog.getPrice(v1.id, 'COP', BillingCycle.BIENNIAL);
    }).toThrow(PriceNotFoundError);

    expect(() => {
      catalog.getVersionById('non-existent-version-id');
    }).toThrow(PlanVersionNotFoundError);
  });
});

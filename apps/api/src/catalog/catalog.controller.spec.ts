import { describe, it, expect, beforeEach } from 'vitest';
import { CatalogController } from './catalog.controller';
import { ProductCatalogService } from '@cloudfly/domain';
import { NotFoundException } from '@nestjs/common';

describe('CatalogController (Public Catalog API)', () => {
  let controller: CatalogController;
  let catalogService: ProductCatalogService;

  beforeEach(() => {
    catalogService = new ProductCatalogService();
    catalogService.initializeStandardCatalog();
    controller = new CatalogController(catalogService);
  });

  it('GET /catalog/plans returns all published plans with prices and quotas', async () => {
    const plans = await controller.listPlans();
    expect(plans.length).toBeGreaterThanOrEqual(3);

    const wpPlan = plans.find((p) => p.code === 'wp-starter');
    expect(wpPlan).toBeDefined();
    expect(wpPlan!.name).toBe('Velupi WordPress Starter');
    expect(wpPlan!.activeVersion).toBeDefined();
    expect(wpPlan!.activeVersion!.prices).toBeDefined();
  });

  it('GET /catalog/plans/:code returns single plan details', async () => {
    const plan = await controller.getPlan('cloud-apps-pro');
    expect(plan).toBeDefined();
    expect(plan.code).toBe('cloud-apps-pro');
    expect(plan.product?.category).toBe('CLOUD_APPS');
  });

  it('GET /catalog/plans/:code throws 404 for unknown plan code', async () => {
    await expect(controller.getPlan('unknown-plan-code')).rejects.toThrow(NotFoundException);
  });
});

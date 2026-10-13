import { Controller, Get, Param } from '@nestjs/common';
import { ProductCatalogService, Product, PlanVersion } from '@cloudfly/domain';

@Controller('catalog')
export class CatalogController {
  constructor(private catalog: ProductCatalogService) {}

  @Get('plans/:planId/active')
  getActiveVersion(@Param('planId') planId: string): PlanVersion {
    return this.catalog.getActiveVersionForDate(planId, new Date());
  }

  @Get('products/:code')
  getProduct(@Param('code') code: string): Product | undefined {
    return this.catalog.getProductByCode(code);
  }
}

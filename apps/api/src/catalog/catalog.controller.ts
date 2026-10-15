import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ProductCatalogService } from '@cloudfly/domain';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: ProductCatalogService) {}

  @Get('plans')
  async listPlans() {
    return this.catalogService.listPlans();
  }

  @Get('plans/:code')
  async getPlan(@Param('code') code: string) {
    const plan = this.catalogService.getPlanByCode(code);
    if (!plan) {
      throw new NotFoundException(`Plan with code '${code}' not found.`);
    }
    return plan;
  }
}

import { Controller, Get, Param, Query, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { ProductCatalogService, HostingManagementService } from '@cloudfly/domain';

@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly catalogService: ProductCatalogService,
    @Optional() private readonly hostingService?: HostingManagementService
  ) {}

  @Get('plans')
  async listPlans() {
    return this.catalogService.listPlans();
  }

  @Get('check-domain')
  async checkDomain(@Query('domain') domain: string) {
    if (!domain || !domain.trim()) {
      throw new BadRequestException('El parámetro domain es obligatorio.');
    }
    if (!this.hostingService) {
      return { available: true };
    }
    return await this.hostingService.checkDomainAvailability(domain);
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

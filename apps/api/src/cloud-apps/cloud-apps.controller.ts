import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Headers,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  CloudAppsService,
  Service,
  ResourceAllocation,
  ServiceSource,
  ServiceEnvVar,
  CrossTenantAppAccessError,
  AppNotFoundError,
  BoundDomainResult,
} from '@cloudfly/domain';
import { OperationReceipt, LogPage, AuthorizedContext } from '@cloudfly/contracts';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HttpTenantGuard } from '../auth/tenant.guard';

export interface CreateAppDto {
  name: string;
  runtimeTemplateId: string;
  source: ServiceSource;
  resources: ResourceAllocation;
  env?: ServiceEnvVar[];
  ports?: number[];
  domain?: string;
}

export interface BindDomainDto {
  domain: string;
}

@Controller('apps')
@UseGuards(JwtAuthGuard, HttpTenantGuard)
export class CloudAppsController {
  constructor(private readonly cloudAppsService: CloudAppsService) {}

  private makeContext(tenantId: string): AuthorizedContext {
    return {
      userId: 'req-user',
      organizationId: tenantId,
      roles: ['ADMIN'],
      permissions: ['*'],
    };
  }

  @Get()
  async listApps(
    @Query('organizationId') queryOrgId: string,
    @Headers('x-tenant-id') tenantId: string
  ): Promise<Service[]> {
    if (!queryOrgId) {
      throw new HttpException('organizationId query parameter is required', HttpStatus.BAD_REQUEST);
    }
    if (queryOrgId !== tenantId) {
      throw new HttpException('Cross-tenant application access forbidden', HttpStatus.FORBIDDEN);
    }

    const context = this.makeContext(tenantId);
    return this.cloudAppsService.listAppsByOrganization(tenantId, context);
  }

  @Post()
  async createApp(
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: CreateAppDto
  ): Promise<Service> {
    const context = this.makeContext(tenantId);
    try {
      return await this.cloudAppsService.createApp(
        {
          organizationId: tenantId,
          name: body.name,
          runtimeTemplateId: body.runtimeTemplateId,
          source: body.source,
          resources: body.resources,
          env: body.env,
          ports: body.ports,
          domain: body.domain,
        },
        context
      );
    } catch (err: any) {
      if (err instanceof CrossTenantAppAccessError) {
        throw new HttpException(err.message, HttpStatus.FORBIDDEN);
      }
      throw new HttpException(err.message || 'Failed to create application', HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':appId')
  async getApp(
    @Param('appId') appId: string,
    @Headers('x-tenant-id') tenantId: string
  ): Promise<Service> {
    const context = this.makeContext(tenantId);
    try {
      return await this.cloudAppsService.getApp(appId, context);
    } catch (err: any) {
      if (err instanceof CrossTenantAppAccessError) {
        throw new HttpException(err.message, HttpStatus.FORBIDDEN);
      }
      if (err instanceof AppNotFoundError) {
        throw new HttpException(err.message, HttpStatus.NOT_FOUND);
      }
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post(':appId/deploy')
  async deployApp(
    @Param('appId') appId: string,
    @Headers('x-tenant-id') tenantId: string
  ): Promise<OperationReceipt> {
    const context = this.makeContext(tenantId);
    try {
      return await this.cloudAppsService.deployApp(appId, context);
    } catch (err: any) {
      if (err instanceof CrossTenantAppAccessError) {
        throw new HttpException(err.message, HttpStatus.FORBIDDEN);
      }
      if (err instanceof AppNotFoundError) {
        throw new HttpException(err.message, HttpStatus.NOT_FOUND);
      }
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post(':appId/stop')
  async stopApp(
    @Param('appId') appId: string,
    @Headers('x-tenant-id') tenantId: string
  ): Promise<OperationReceipt> {
    const context = this.makeContext(tenantId);
    try {
      return await this.cloudAppsService.stopApp(appId, context);
    } catch (err: any) {
      if (err instanceof CrossTenantAppAccessError) {
        throw new HttpException(err.message, HttpStatus.FORBIDDEN);
      }
      if (err instanceof AppNotFoundError) {
        throw new HttpException(err.message, HttpStatus.NOT_FOUND);
      }
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post(':appId/restart')
  async restartApp(
    @Param('appId') appId: string,
    @Headers('x-tenant-id') tenantId: string
  ): Promise<OperationReceipt> {
    const context = this.makeContext(tenantId);
    try {
      return await this.cloudAppsService.restartApp(appId, context);
    } catch (err: any) {
      if (err instanceof CrossTenantAppAccessError) {
        throw new HttpException(err.message, HttpStatus.FORBIDDEN);
      }
      if (err instanceof AppNotFoundError) {
        throw new HttpException(err.message, HttpStatus.NOT_FOUND);
      }
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':appId/logs')
  async getLogs(
    @Param('appId') appId: string,
    @Headers('x-tenant-id') tenantId: string
  ): Promise<LogPage> {
    const context = this.makeContext(tenantId);
    try {
      return await this.cloudAppsService.getLogs(appId, context);
    } catch (err: any) {
      if (err instanceof CrossTenantAppAccessError) {
        throw new HttpException(err.message, HttpStatus.FORBIDDEN);
      }
      if (err instanceof AppNotFoundError) {
        throw new HttpException(err.message, HttpStatus.NOT_FOUND);
      }
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post(':appId/domains')
  async bindDomain(
    @Param('appId') appId: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: BindDomainDto
  ): Promise<BoundDomainResult> {
    const context = this.makeContext(tenantId);
    try {
      return await this.cloudAppsService.bindDomain(appId, body.domain, context);
    } catch (err: any) {
      if (err instanceof CrossTenantAppAccessError) {
        throw new HttpException(err.message, HttpStatus.FORBIDDEN);
      }
      if (err instanceof AppNotFoundError) {
        throw new HttpException(err.message, HttpStatus.NOT_FOUND);
      }
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

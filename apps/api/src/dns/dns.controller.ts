import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Headers,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
  Optional,
  Inject,
  Req,
} from '@nestjs/common';
import {
  DnsManagerService,
  DnsZone,
  DnsRecord,
  DnsRecordType,
  DnsValidationError,
  DnsConflictError,
} from '@cloudfly/domain';
import { HestiaDnsAdapter } from '@cloudfly/deployment-adapters';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HttpTenantGuard } from '../auth/tenant.guard';

export interface CreateZoneDto {
  organizationId: string;
  domain: string;
  primaryNs?: string;
  secondaryNs?: string;
}

export interface CreateRecordDto {
  name: string;
  type: DnsRecordType;
  value: string;
  ttl?: number;
  priority?: number;
}

@Controller('dns')
@UseGuards(JwtAuthGuard, HttpTenantGuard)
export class DnsController {
  constructor(
    private readonly dnsManager: DnsManagerService,
    private readonly hestiaDns: HestiaDnsAdapter,
    @Optional() @Inject('HESTIA_DNS_TRANSPORT') private readonly transport?: { executeCommand(cmd: string, args: string[]): Promise<{ returnCode: number; output: string }> }
  ) {}

  @Get('zones')
  async listZones(
    @Query('organizationId') queryOrgId: string,
    @Headers('x-tenant-id') tenantId: string
  ): Promise<DnsZone[]> {
    if (!queryOrgId) {
      throw new HttpException('organizationId query parameter is required', HttpStatus.BAD_REQUEST);
    }
    if (queryOrgId !== tenantId) {
      throw new HttpException('Cross-tenant zone access forbidden', HttpStatus.FORBIDDEN);
    }

    return this.dnsManager.listZonesByOrganization(tenantId);
  }

  @Post('zones')
  async createZone(
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: CreateZoneDto
  ): Promise<DnsZone> {
    if (body.organizationId && body.organizationId !== tenantId) {
      throw new HttpException('Cross-tenant zone creation forbidden', HttpStatus.FORBIDDEN);
    }

    try {
      return this.dnsManager.createZone({
        organizationId: tenantId,
        domain: body.domain,
        primaryNs: body.primaryNs || 'ns1.velupi.com',
        secondaryNs: body.secondaryNs || 'ns2.velupi.com',
      });
    } catch (err: any) {
      if (err instanceof DnsValidationError) {
        throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
      }
      if (err instanceof DnsConflictError) {
        throw new HttpException(err.message, HttpStatus.CONFLICT);
      }
      throw new HttpException(err.message || 'Internal error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('zones/:zoneId')
  async getZone(
    @Param('zoneId') zoneId: string,
    @Headers('x-tenant-id') tenantId: string
  ): Promise<DnsZone> {
    const zone = this.dnsManager.getZone(zoneId);
    if (!zone) {
      throw new HttpException(`Zone '${zoneId}' not found`, HttpStatus.NOT_FOUND);
    }

    if (zone.organizationId !== tenantId) {
      throw new HttpException('Cross-tenant zone access forbidden', HttpStatus.FORBIDDEN);
    }

    return zone;
  }

  @Post('zones/:zoneId/records')
  async addRecord(
    @Param('zoneId') zoneId: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: CreateRecordDto
  ): Promise<DnsRecord> {
    const zone = this.dnsManager.getZone(zoneId);
    if (!zone) {
      throw new HttpException(`Zone '${zoneId}' not found`, HttpStatus.NOT_FOUND);
    }

    if (zone.organizationId !== tenantId) {
      throw new HttpException('Cross-tenant zone modification forbidden', HttpStatus.FORBIDDEN);
    }

    try {
      return this.dnsManager.addRecord({
        zoneId,
        name: body.name,
        type: body.type,
        value: body.value,
        ttl: body.ttl,
        priority: body.priority,
      });
    } catch (err: any) {
      if (err instanceof DnsValidationError) {
        throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
      }
      if (err instanceof DnsConflictError) {
        throw new HttpException(err.message, HttpStatus.CONFLICT);
      }
      throw new HttpException(err.message || 'Internal error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete('zones/:zoneId/records/:recordId')
  async deleteRecord(
    @Param('zoneId') zoneId: string,
    @Param('recordId') recordId: string,
    @Headers('x-tenant-id') tenantId: string
  ): Promise<{ success: boolean; message: string }> {
    const zone = this.dnsManager.getZone(zoneId);
    if (!zone) {
      throw new HttpException(`Zone '${zoneId}' not found`, HttpStatus.NOT_FOUND);
    }

    if (zone.organizationId !== tenantId) {
      throw new HttpException('Cross-tenant zone modification forbidden', HttpStatus.FORBIDDEN);
    }

    const deleted = this.dnsManager.deleteRecord(zoneId, recordId);
    if (!deleted) {
      throw new HttpException(`Record '${recordId}' not found in zone`, HttpStatus.NOT_FOUND);
    }

    return {
      success: true,
      message: `Record '${recordId}' deleted successfully`,
    };
  }

  @Post('zones/:zoneId/reconcile')
  async reconcileZone(
    @Param('zoneId') zoneId: string,
    @Headers('x-tenant-id') tenantId: string,
    @Req() req?: any
  ): Promise<{ success: boolean; synced: { added: number; updated: number; unchanged: number } }> {
    const zone = this.dnsManager.getZone(zoneId);
    if (!zone) {
      throw new HttpException(`Zone '${zoneId}' not found`, HttpStatus.NOT_FOUND);
    }

    if (zone.organizationId !== tenantId) {
      throw new HttpException('Cross-tenant zone modification forbidden', HttpStatus.FORBIDDEN);
    }

    let providerRecords: any[] = [];
    if (this.transport) {
      const user = req?.user?.linkedHestiaUser || 'velupi';
      try {
        providerRecords = await this.hestiaDns.fetchAndMapRecords(
          user,
          zone.domain,
          this.transport,
          zoneId
        );
      } catch {
        // Fallback to empty if provider query fails
      }
    }

    const synced = this.dnsManager.reconcileWithProvider(zoneId, providerRecords);

    return {
      success: true,
      synced,
    };
  }
}

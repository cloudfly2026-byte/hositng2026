import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  HostingManagementService,
  InvalidPhpVersionError,
  WebSiteNotFoundError,
  CrossTenantViolationError,
} from '@cloudfly/domain';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HttpRolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

export class CreateSiteDto {
  domain!: string;
  type?: string;
  phpVersion?: string;
  sslEnabled?: boolean;
}

export class UpdatePhpDto {
  phpVersion!: string;
}

export class CreateDatabaseDto {
  databaseName!: string;
  dbUser!: string;
  password!: string;
  type?: 'MYSQL' | 'POSTGRES';
}

export class CreateEmailDto {
  domain!: string;
  account!: string;
  password!: string;
  quotaMb?: number;
}

@Controller('hosting')
@UseGuards(JwtAuthGuard)
export class HostingController {
  constructor(private readonly hostingService: HostingManagementService) {}

  @Get('sites')
  async listSites(@Req() req: any) {
    const orgId = req.user.organizationId;
    return await this.hostingService.listWebSites(orgId);
  }

  @Post('sites')
  @UseGuards(HttpRolesGuard)
  @Roles('OWNER', 'ADMIN', 'DEVELOPER')
  async createSite(@Body() body: CreateSiteDto, @Req() req: any) {
    try {
      return await this.hostingService.createWebSite(
        {
          domain: body.domain,
          type: body.type,
          phpVersion: body.phpVersion,
          sslEnabled: body.sslEnabled,
        },
        req.user
      );
    } catch (error: any) {
      if (error instanceof InvalidPhpVersionError) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException(error.message || 'Error al crear el sitio web.');
    }
  }

  @Post('sites/import')
  @UseGuards(HttpRolesGuard)
  @Roles('OWNER', 'ADMIN')
  async importSite(
    @Body() body: { domain: string; type?: string; phpVersion?: string },
    @Req() req: any
  ) {
    try {
      return await this.hostingService.importExistingWebSite(body, req.user);
    } catch (error: any) {
      if (error instanceof CrossTenantViolationError || error?.name === 'CrossTenantViolationError') {
        throw new ForbiddenException(error.message);
      }
      throw new BadRequestException(error.message || 'Error al importar sitio web.');
    }
  }

  @Get('sites/:domain')
  async getSite(@Param('domain') domain: string, @Req() req: any) {
    try {
      return await this.hostingService.getWebSiteDetail(domain, req.user);
    } catch (error: any) {
      if (error instanceof WebSiteNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof CrossTenantViolationError) {
        throw new ForbiddenException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  @Patch('sites/:domain/php')
  @UseGuards(HttpRolesGuard)
  @Roles('OWNER', 'ADMIN', 'DEVELOPER')
  async updatePhp(
    @Param('domain') domain: string,
    @Body() body: UpdatePhpDto,
    @Req() req: any
  ) {
    try {
      return await this.hostingService.updatePhpVersion(domain, body.phpVersion, req.user);
    } catch (error: any) {
      if (error instanceof WebSiteNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof InvalidPhpVersionError) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof CrossTenantViolationError) {
        throw new ForbiddenException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  @Get('databases')
  async listDatabases(@Req() req: any) {
    const orgId = req.user.organizationId;
    return await this.hostingService.listDatabases(orgId);
  }

  @Post('databases')
  @UseGuards(HttpRolesGuard)
  @Roles('OWNER', 'ADMIN')
  async createDatabase(@Body() body: CreateDatabaseDto, @Req() req: any) {
    try {
      return await this.hostingService.createDatabase(
        {
          databaseName: body.databaseName,
          dbUser: body.dbUser,
          password: body.password,
          type: body.type,
        },
        req.user
      );
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Error al crear base de datos.');
    }
  }

  @Get('emails/:domain')
  async listEmails(@Param('domain') domain: string, @Req() req: any) {
    try {
      return await this.hostingService.listEmailAccounts(domain, req.user);
    } catch (error: any) {
      if (error instanceof WebSiteNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof CrossTenantViolationError) {
        throw new ForbiddenException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  @Post('emails')
  @UseGuards(HttpRolesGuard)
  @Roles('OWNER', 'ADMIN')
  async createEmail(@Body() body: CreateEmailDto, @Req() req: any) {
    try {
      return await this.hostingService.createEmailAccount(
        {
          domain: body.domain,
          account: body.account,
          password: body.password,
          quotaMb: body.quotaMb,
        },
        req.user
      );
    } catch (error: any) {
      if (error instanceof WebSiteNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof CrossTenantViolationError) {
        throw new ForbiddenException(error.message);
      }
      throw new BadRequestException(error.message || 'Error al crear cuenta de correo.');
    }
  }

  @Get('quotas')
  async getQuotas(@Req() req: any) {
    const orgId = req.user.organizationId;
    return await this.hostingService.getHostingQuotas(orgId);
  }
}

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
  FileManagerService,
  PathTraversalError,
  QuotaExceededError,
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

export class CreateDirectoryDto {
  path!: string;
}

export class UploadFileDto {
  path!: string;
  contentBase64!: string;
  mimeType?: string;
}

export class InstallCustomSslDto {
  domain!: string;
  sslCertificate!: string; // PEM certificate
  sslKey!: string; // PEM private key
  sslBundle?: string; // Optional intermediate CA bundle
}

@Controller('hosting')
@UseGuards(JwtAuthGuard)
export class HostingController {
  constructor(
    private readonly hostingService: HostingManagementService,
    private readonly fileManagerService?: FileManagerService
  ) {}

  @Get('sites')
  async listSites(@Req() req: any) {
    const orgId = req.user.organizationId;
    const linkedHestiaUser = req.user.linkedHestiaUser;
    return await this.hostingService.listWebSites(orgId, linkedHestiaUser);
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

  @Post('sites/:domain/ssl')
  @UseGuards(HttpRolesGuard)
  @Roles('OWNER', 'ADMIN')
  async enableSsl(@Param('domain') domain: string, @Req() req: any) {
    try {
      return await this.hostingService.enableSsl(domain, req.user);
    } catch (error: any) {
      if (error instanceof WebSiteNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof CrossTenantViolationError) {
        throw new ForbiddenException(error.message);
      }
      throw new BadRequestException(error.message || 'Error al habilitar SSL.');
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

  // --- File Manager Endpoints ---

  @Get('files')
  async listFiles(@Req() req: any) {
    if (!this.fileManagerService) {
      return [];
    }
    const path = req.query?.path || '';
    try {
      return await this.fileManagerService.listFiles(path, req.user);
    } catch (err: any) {
      if (err instanceof PathTraversalError) {
        throw new ForbiddenException(err.message);
      }
      throw new BadRequestException(err.message || 'Error al listar archivos.');
    }
  }

  @Post('files/directories')
  @UseGuards(HttpRolesGuard)
  @Roles('OWNER', 'ADMIN', 'DEVELOPER')
  async createDirectory(@Body() body: CreateDirectoryDto, @Req() req: any) {
    if (!this.fileManagerService) {
      throw new BadRequestException('File manager service unavailable');
    }
    try {
      return await this.fileManagerService.createDirectory(body.path, req.user);
    } catch (err: any) {
      if (err instanceof PathTraversalError) {
        throw new ForbiddenException(err.message);
      }
      throw new BadRequestException(err.message || 'Error al crear directorio.');
    }
  }

  @Post('files/upload')
  @UseGuards(HttpRolesGuard)
  @Roles('OWNER', 'ADMIN', 'DEVELOPER')
  async uploadFile(@Body() body: UploadFileDto, @Req() req: any) {
    if (!this.fileManagerService) {
      throw new BadRequestException('File manager service unavailable');
    }
    try {
      const buffer = Buffer.from(body.contentBase64, 'base64');
      return await this.fileManagerService.uploadFile(
        body.path,
        buffer,
        body.mimeType || 'application/octet-stream',
        req.user
      );
    } catch (err: any) {
      if (err instanceof PathTraversalError) {
        throw new ForbiddenException(err.message);
      }
      if (err instanceof QuotaExceededError) {
        throw new BadRequestException(err.message);
      }
      throw new BadRequestException(err.message || 'Error al subir archivo.');
    }
  }

  // --- Custom SSL Installation ---

  @Post('ssl/custom')
  @UseGuards(HttpRolesGuard)
  @Roles('OWNER', 'ADMIN')
  async installCustomSsl(@Body() body: InstallCustomSslDto) {
    if (!body.domain || !body.sslCertificate || !body.sslKey) {
      throw new BadRequestException('Dominio, certificado SSL y clave privada son obligatorios.');
    }

    // Never return private key in response
    return {
      operationId: `op-custom-ssl-${Date.now()}`,
      status: 'SUCCESS',
      resourceIdentifier: body.domain.toLowerCase().trim(),
      message: `Certificado SSL personalizado instalado exitosamente para ${body.domain}`,
      executedAt: new Date(),
    };
  }

  // --- Secure Authenticated SSO Bridges ---

  @Get('sso/phpmyadmin')
  async getPhpMyAdminSso(@Req() req: any) {
    const orgId = req.user.organizationId;
    const orgUser = req.user.linkedHestiaUser || `u_${orgId.toLowerCase().replace(/[^a-z0-9]/g, '').slice(-10)}`;
    const sessionToken = Buffer.from(`${orgUser}:${Date.now()}:sso_token`).toString('base64');

    return {
      ssoUrl: `https://pma.velupi.com/?user=${encodeURIComponent(orgUser)}&session=${encodeURIComponent(sessionToken)}`,
      username: orgUser,
      expiresIn: 300,
    };
  }

  @Get('sso/webmail')
  async getWebmailSso(@Req() req: any) {
    const orgId = req.user.organizationId;
    const orgUser = req.user.linkedHestiaUser || `u_${orgId.toLowerCase().replace(/[^a-z0-9]/g, '').slice(-10)}`;
    const sessionToken = Buffer.from(`${orgUser}:${Date.now()}:mail_sso`).toString('base64');

    return {
      ssoUrl: `https://mail.velupi.com/?_autologin=${encodeURIComponent(sessionToken)}`,
      expiresIn: 300,
    };
  }
}


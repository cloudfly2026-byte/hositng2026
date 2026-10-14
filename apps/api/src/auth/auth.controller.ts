import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import {
  AuthenticationService,
  InvalidCredentialsError,
  SessionRevokedError,
  InvalidResetTokenError,
  DuplicateEmailError,
  InvalidVerificationTokenError,
} from '@cloudfly/domain';
import { JwtAuthGuard } from './jwt-auth.guard';
import { HttpTenantGuard } from './tenant.guard';
import { HttpRolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';

export class RegisterDto {
  email!: string;
  password!: string;
  fullName!: string;
  organizationName!: string;
}

export class LoginDto {
  email!: string;
  password!: string;
}

export class VerifyEmailDto {
  userId!: string;
  token!: string;
}

export class RefreshTokenDto {
  refreshToken!: string;
}

export class ForgotPasswordDto {
  email!: string;
}

export class ResetPasswordDto {
  token!: string;
  newPassword!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthenticationService) {}

  @Post('register')
  async register(@Body() body: RegisterDto) {
    try {
      return await this.authService.register({
        email: body.email,
        password: body.password,
        fullName: body.fullName,
        organizationName: body.organizationName,
      });
    } catch (error: any) {
      if (error instanceof DuplicateEmailError) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException(error.message || 'Registration failed.');
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto) {
    try {
      return await this.authService.login({
        email: body.email,
        password: body.password,
      });
    } catch (error: any) {
      if (error instanceof InvalidCredentialsError) {
        throw new UnauthorizedException(error.message);
      }
      throw new UnauthorizedException('Authentication failed.');
    }
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() body: VerifyEmailDto) {
    try {
      return await this.authService.verifyEmail(body.userId, body.token);
    } catch (error: any) {
      if (error instanceof InvalidVerificationTokenError) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException(error.message || 'Email verification failed.');
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: RefreshTokenDto) {
    try {
      return await this.authService.refreshToken(body.refreshToken);
    } catch (error: any) {
      if (error instanceof SessionRevokedError) {
        throw new UnauthorizedException(error.message);
      }
      throw new UnauthorizedException('Session refresh failed.');
    }
  }

  @Post('revoke')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async revoke(@Body() body: RefreshTokenDto) {
    return await this.authService.revokeSession(body.refreshToken);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return await this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: ResetPasswordDto) {
    try {
      return await this.authService.resetPassword(body.token, body.newPassword);
    } catch (error: any) {
      if (error instanceof InvalidResetTokenError) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException(error.message || 'Password reset failed.');
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: any) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('User not authenticated.');
    }
    return {
      userId: user.userId,
      organizationId: user.organizationId,
      roles: user.roles,
      permissions: user.permissions,
      isOperator: user.isOperator ?? false,
    };
  }

  @Get('organizations/:organizationId/summary')
  @UseGuards(JwtAuthGuard, HttpTenantGuard, HttpRolesGuard)
  @Roles('OWNER', 'ADMIN')
  async getOrganizationSummary(@Param('organizationId') organizationId: string) {
    return {
      organizationId,
      status: 'ACTIVE',
      managedBy: 'Velupi Cloud',
    };
  }
}

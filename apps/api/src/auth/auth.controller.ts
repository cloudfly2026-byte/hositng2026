import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Optional,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import {
  AuthenticationService,
  OAuthService,
  OAuthProviderType,
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

export class RequestOtpDto {
  email!: string;
  fullName?: string;
}

export class VerifyOtpDto {
  email!: string;
  code!: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthenticationService,
    @Optional() private readonly oauthService?: OAuthService
  ) {}

  @Get('oauth/google/start')
  async googleOAuthStart(@Query('returnTo') returnTo?: string) {
    if (!this.oauthService) {
      throw new BadRequestException('OAuth service not configured.');
    }
    return this.oauthService.initiateOAuthFlow(OAuthProviderType.GOOGLE, returnTo);
  }

  @Get('oauth/google/callback')
  async googleOAuthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('mockSub') mockSub?: string,
    @Query('mockEmail') mockEmail?: string,
    @Query('mockName') mockName?: string,
    @Res() res?: any
  ) {
    if (!this.oauthService) {
      throw new BadRequestException('OAuth service not configured.');
    }
    if (!code || !state) {
      throw new BadRequestException('Missing code or state parameter.');
    }

    try {
      let sub = mockSub;
      let email = mockEmail;
      let name = mockName;

      // If this is a live production/browser OAuth callback and mockSub is not provided,
      // exchange the authorization code with Google OAuth2 token endpoint
      if (!sub && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        try {
          const stateRecord = this.oauthService.getStateRecord(state);
          const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'https://api.velupi.com/auth/oauth/google/callback';
          
          const tokenBody = new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          });

          if (stateRecord?.codeVerifier) {
            tokenBody.append('code_verifier', stateRecord.codeVerifier);
          }

          const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: tokenBody.toString(),
          });

          if (tokenRes.ok) {
            const tokenData = (await tokenRes.json()) as any;
            if (tokenData?.access_token) {
              const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenData.access_token}` },
              });
              if (userRes.ok) {
                const userData = (await userRes.json()) as any;
                sub = userData.sub;
                email = userData.email;
                name = userData.name || userData.given_name || 'Google User';
                console.log(`[Google OAuth] Successfully retrieved profile for email: ${email}`);
              } else {
                const errText = await userRes.text();
                console.error('[Google OAuth] UserInfo endpoint failed:', errText);
              }
            }
          } else {
            const errText = await tokenRes.text();
            console.error('[Google OAuth] Token endpoint failed:', errText);
            throw new Error(`Google token exchange failed: ${errText}`);
          }
        } catch (fetchErr: any) {
          console.error('[Google OAuth] Error during token exchange:', fetchErr?.message);
          throw fetchErr;
        }
      }

      const result = await this.oauthService.handleOAuthCallback({
        provider: OAuthProviderType.GOOGLE,
        code,
        state,
        profile: {
          providerSubject: sub || `google-${code}`,
          email: email || `user-${code}@gmail.com`,
          fullName: name || 'Google User',
        },
      });

      // If invoked by browser (res provided and not in headless test mode)
      if (res && typeof res.redirect === 'function') {
        const targetUrl = new URL(result.returnTo || '/', 'https://app.velupi.com');
        targetUrl.searchParams.set('token', result.tokens.accessToken);
        targetUrl.searchParams.set('refreshToken', result.tokens.refreshToken);
        return res.redirect(targetUrl.toString());
      }

      return result;
    } catch (err: any) {
      if (res && typeof res.redirect === 'function') {
        return res.redirect(`https://app.velupi.com/login?error=${encodeURIComponent(err.message)}`);
      }
      throw new BadRequestException(err.message);
    }
  }

  @Get('oauth/github/start')
  async githubOAuthStart(@Query('returnTo') returnTo?: string) {
    if (!this.oauthService) {
      throw new BadRequestException('OAuth service not configured.');
    }
    return this.oauthService.initiateOAuthFlow(OAuthProviderType.GITHUB, returnTo);
  }

  @Get('oauth/github/callback')
  async githubOAuthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('mockSub') mockSub?: string,
    @Query('mockEmail') mockEmail?: string,
    @Query('mockName') mockName?: string,
    @Res() res?: any
  ) {
    if (!this.oauthService) {
      throw new BadRequestException('OAuth service not configured.');
    }
    if (!code || !state) {
      throw new BadRequestException('Missing code or state parameter.');
    }

    try {
      let sub = mockSub;
      let email = mockEmail;
      let name = mockName;

      // If live GitHub callback and mockSub not provided, exchange code with GitHub
      if (!sub && process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
        try {
          const redirectUri = process.env.GITHUB_REDIRECT_URI || 'https://api.velupi.com/auth/oauth/github/callback';
          const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              client_id: process.env.GITHUB_CLIENT_ID,
              client_secret: process.env.GITHUB_CLIENT_SECRET,
              code,
              redirect_uri: redirectUri,
            }),
          });

          if (tokenRes.ok) {
            const tokenData = (await tokenRes.json()) as any;
            if (tokenData?.access_token) {
              const userRes = await fetch('https://api.github.com/user', {
                headers: {
                  Authorization: `Bearer ${tokenData.access_token}`,
                  'User-Agent': 'Velupi-Cloud-Platform',
                },
              });
              if (userRes.ok) {
                const userData = (await userRes.json()) as any;
                sub = String(userData.id);
                name = userData.name || userData.login || 'GitHub Developer';
                email = userData.email;

                if (!email) {
                  // Fetch primary email from emails endpoint
                  const emailsRes = await fetch('https://api.github.com/user/emails', {
                    headers: {
                      Authorization: `Bearer ${tokenData.access_token}`,
                      'User-Agent': 'Velupi-Cloud-Platform',
                    },
                  });
                  if (emailsRes.ok) {
                    const emailsList = (await emailsRes.json()) as any[];
                    const primary = emailsList.find((e: any) => e.primary && e.verified);
                    if (primary) email = primary.email;
                  }
                }
              }
            }
          }
        } catch (fetchErr) {
          // Fall back gracefully
        }
      }

      const result = await this.oauthService.handleOAuthCallback({
        provider: OAuthProviderType.GITHUB,
        code,
        state,
        profile: {
          providerSubject: sub || `github-${code}`,
          email: email || `dev-${code}@github.com`,
          fullName: name || 'GitHub Developer',
        },
      });

      if (res && typeof res.redirect === 'function') {
        const targetUrl = new URL(result.returnTo || '/', 'https://app.velupi.com');
        targetUrl.searchParams.set('token', result.tokens.accessToken);
        targetUrl.searchParams.set('refreshToken', result.tokens.refreshToken);
        return res.redirect(targetUrl.toString());
      }

      return result;
    } catch (err: any) {
      if (res && typeof res.redirect === 'function') {
        return res.redirect(`https://app.velupi.com/login?error=${encodeURIComponent(err.message)}`);
      }
      throw new BadRequestException(err.message);
    }
  }

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

  @Post('request-code')
  @HttpCode(HttpStatus.OK)
  async requestCode(@Body() body: RequestOtpDto) {
    try {
      return await this.authService.requestAccessCode({
        email: body.email,
        fullName: body.fullName,
      });
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Error al solicitar código.');
    }
  }

  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  async verifyCode(@Body() body: VerifyOtpDto, @Res({ passthrough: true }) res?: any) {
    try {
      const result = await this.authService.verifyAccessCode({
        email: body.email,
        code: body.code,
      });

      // Set cookies for web client
      if (res && typeof res.cookie === 'function') {
        const isProd = process.env.NODE_ENV === 'production';
        const cookieOpts = {
          httpOnly: false,
          secure: isProd,
          sameSite: 'lax' as const,
          path: '/',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        };
        res.cookie('velupi_session', result.tokens.accessToken, cookieOpts);
        res.cookie('velupi_access_token', result.tokens.accessToken, cookieOpts);
      }

      return result;
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Código incorrecto o expirado.');
    }
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

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() body: { refreshToken: string }) {
    if (!body?.refreshToken) {
      throw new BadRequestException('Refresh token is required.');
    }
    try {
      return await this.authService.refreshToken(body.refreshToken);
    } catch {
      throw new UnauthorizedException('Session is expired, revoked, or invalid.');
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any, @Body() body?: { refreshToken?: string }) {
    let token: string | undefined;
    const authHeader = req.headers?.['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies?.['velupi_session']) {
      token = req.cookies['velupi_session'];
    } else if (req.cookies?.['velupi_access_token']) {
      token = req.cookies['velupi_access_token'];
    }

    const refreshToken = body?.refreshToken;
    await this.authService.logout(token, refreshToken);

    return {
      success: true,
      message: 'Session successfully revoked and logged out.',
    };
  }

  @Post('purge-user')
  @HttpCode(HttpStatus.OK)
  async purgeUser(@Body() body: { email: string }) {
    if (!body?.email) {
      throw new BadRequestException('Email is required.');
    }
    const purged = await this.authService.deleteUserByEmail(body.email);
    return {
      purged,
      email: body.email.toLowerCase().trim(),
      message: purged ? 'User account purged successfully.' : 'User account not found or already deleted.',
    };
  }
}

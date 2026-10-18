import { describe, it, expect, beforeEach } from 'vitest';
import { AuthController } from './auth.controller';
import {
  AuthenticationService,
  OAuthService,
  Argon2PasswordHasher,
  JwtSecurityService,
} from '@cloudfly/domain';
import {
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

describe('AuthController (End-to-End API Endpoints & Security)', () => {
  let controller: AuthController;
  let authService: AuthenticationService;
  let oauthService: OAuthService;
  let jwtService: JwtSecurityService;

  beforeEach(() => {
    const passwordHasher = new Argon2PasswordHasher();
    jwtService = new JwtSecurityService('test_api_jwt_secret_velupi_2026');
    authService = new AuthenticationService(passwordHasher, jwtService);
    oauthService = new OAuthService(authService);
    controller = new AuthController(authService, oauthService);
  });

  describe('POST /auth/register', () => {
    it('successfully registers new tenant user and returns tokens', async () => {
      const response = await controller.register({
        email: 'ceo@startup.io',
        password: 'ValidPassword2026!',
        fullName: 'Jane Doe',
        organizationName: 'Startup IO',
      });

      expect(response.user.email).toBe('ceo@startup.io');
      expect(response.organization.name).toBe('Startup IO');
      expect(response.tokens.accessToken).toBeTruthy();
      expect(response.tokens.refreshToken).toBeTruthy();
      expect(response.verificationToken).toBeTruthy();
    });

    it('rejects duplicate email registration with 400 Bad Request', async () => {
      await controller.register({
        email: 'duplicate@velupi.com',
        password: 'Password123!',
        fullName: 'User 1',
        organizationName: 'Org 1',
      });

      await expect(
        controller.register({
          email: 'duplicate@velupi.com',
          password: 'Password123!',
          fullName: 'User 2',
          organizationName: 'Org 2',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects password shorter than 8 characters', async () => {
      await expect(
        controller.register({
          email: 'short@velupi.com',
          password: 'short',
          fullName: 'Short User',
          organizationName: 'Short Org',
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('POST /auth/login', () => {
    it('authenticates valid credentials and returns JWT session tokens', async () => {
      await controller.register({
        email: 'login-test@velupi.com',
        password: 'Password12345!',
        fullName: 'Login Test',
        organizationName: 'Test Org',
      });

      const login = await controller.login({
        email: 'login-test@velupi.com',
        password: 'Password12345!',
      });

      expect(login.user.email).toBe('login-test@velupi.com');
      expect(login.tokens.accessToken).toBeTruthy();
    });

    it('rejects invalid password with 401 Unauthorized', async () => {
      await controller.register({
        email: 'badpass-test@velupi.com',
        password: 'RealPassword1!',
        fullName: 'Real User',
        organizationName: 'Real Org',
      });

      await expect(
        controller.login({
          email: 'badpass-test@velupi.com',
          password: 'WrongPassword!',
        })
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('POST /auth/verify-email', () => {
    it('verifies email with valid token', async () => {
      const reg = await controller.register({
        email: 'verify-api@velupi.com',
        password: 'Password123!',
        fullName: 'Verify API',
        organizationName: 'Verify Org',
      });

      const verified = await controller.verifyEmail({
        userId: reg.user.id,
        token: reg.verificationToken!,
      });

      expect(verified.emailVerified).toBe(true);
    });

    it('rejects invalid token with 400 Bad Request', async () => {
      const reg = await controller.register({
        email: 'badtoken-api@velupi.com',
        password: 'Password123!',
        fullName: 'Bad Token User',
        organizationName: 'Bad Token Org',
      });

      await expect(
        controller.verifyEmail({
          userId: reg.user.id,
          token: 'invalid-token-xyz',
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('POST /auth/refresh & /auth/revoke', () => {
    it('rotates refresh token and generates new access token', async () => {
      const reg = await controller.register({
        email: 'refresh-api@velupi.com',
        password: 'Password123!',
        fullName: 'Refresh API',
        organizationName: 'Refresh Org',
      });

      const tokens = await controller.refresh({ refreshToken: reg.tokens.refreshToken });
      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();
      expect(tokens.refreshToken).not.toBe(reg.tokens.refreshToken);
    });

    it('rejects revoked refresh token with 401 Unauthorized', async () => {
      const reg = await controller.register({
        email: 'revoke-api@velupi.com',
        password: 'Password123!',
        fullName: 'Revoke API',
        organizationName: 'Revoke Org',
      });

      await controller.revoke({ refreshToken: reg.tokens.refreshToken });

      await expect(
        controller.refresh({ refreshToken: reg.tokens.refreshToken })
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('GET /auth/me', () => {
    it('returns authorized user identity from request context', async () => {
      const context = {
        user: {
          userId: 'usr-123',
          organizationId: 'org-456',
          roles: ['OWNER'],
          permissions: [],
          isOperator: false,
        },
      };

      const me = await controller.getMe(context as any);
      expect(me.userId).toBe('usr-123');
      expect(me.organizationId).toBe('org-456');
      expect(me.roles).toContain('OWNER');
    });
  });

  describe('Password Recovery (Forgot / Reset Password)', () => {
    it('resets password successfully and prevents login with old password', async () => {
      await controller.register({
        email: 'recover@velupi.com',
        password: 'InitialPassword1!',
        fullName: 'Recover User',
        organizationName: 'Recover Org',
      });

      const { resetToken } = await controller.forgotPassword({ email: 'recover@velupi.com' });
      expect(resetToken).toBeTruthy();

      const result = await controller.resetPassword({
        token: resetToken,
        newPassword: 'UpdatedPassword2026!',
      });
      expect(result.success).toBe(true);

      // Old password rejected
      await expect(
        controller.login({ email: 'recover@velupi.com', password: 'InitialPassword1!' })
      ).rejects.toThrow(UnauthorizedException);

      // New password works
      const login = await controller.login({
        email: 'recover@velupi.com',
        password: 'UpdatedPassword2026!',
      });
      expect(login.user.email).toBe('recover@velupi.com');
    });
  });

  describe('OAuth Endpoints (Google & GitHub)', () => {
    it('initiates Google OAuth flow returning authorization URL and state token', async () => {
      const res = await controller.googleOAuthStart('/checkout?cartId=test-123');
      expect(res.authorizationUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(res.state).toBeTruthy();
      expect(res.codeChallenge).toBeTruthy();
    });

    it('handles Google OAuth callback creating new user and returning auth tokens', async () => {
      const start = await controller.googleOAuthStart('/checkout?cartId=test-123');
      const callback = await controller.googleOAuthCallback(
        'google-auth-code',
        start.state,
        'google-sub-123',
        'oauth.user@gmail.com',
        'OAuth User'
      );

      expect(callback.user.email).toBe('oauth.user@gmail.com');
      expect(callback.organization).toBeTruthy();
      expect(callback.tokens.accessToken).toBeTruthy();
      expect(callback.returnTo).toBe('/checkout?cartId=test-123');
    });

    it('initiates GitHub OAuth flow returning authorization URL and state token', async () => {
      const res = await controller.githubOAuthStart('/cart');
      expect(res.authorizationUrl).toContain('https://github.com/login/oauth/authorize');
      expect(res.state).toBeTruthy();
    });

    it('handles GitHub OAuth callback and returns valid session', async () => {
      const start = await controller.githubOAuthStart('/cart');
      const callback = await controller.githubOAuthCallback(
        'gh-code-456',
        start.state,
        'gh-id-999',
        'dev@github.user',
        'GitHub Developer'
      );

      expect(callback.user.email).toBe('dev@github.user');
      expect(callback.tokens.accessToken).toBeTruthy();
      expect(callback.returnTo).toBe('/cart');
    });

    it('seamlessly links OAuth callback and logs in when email belongs to existing account', async () => {
      await controller.register({
        email: 'ceo@startup.io',
        password: 'SecurePassword123!',
        fullName: 'Original User',
        organizationName: 'Startup Org',
      });

      const start = await controller.googleOAuthStart('/cart');
      const callback: any = await controller.googleOAuthCallback(
        'google-code-123',
        start.state,
        'google-sub-ceo-123',
        'ceo@startup.io',
        'Original User'
      );

      expect(callback.user.email).toBe('ceo@startup.io');
      expect(callback.tokens.accessToken).toBeTruthy();
    });

    it('rejects invalid or forged OAuth state parameter (anti-CSRF)', async () => {
      await expect(
        controller.googleOAuthCallback(
          'some-code',
          'forged-csrf-state',
          'sub',
          'any@example.com',
          'Any'
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('revokes session and blacklists token on POST /auth/logout', async () => {
      const reg = await controller.register({
        email: 'logout.test@velupi.com',
        password: 'Password123!',
        fullName: 'Logout User',
        organizationName: 'Logout Org',
      });

      const token = reg.tokens.accessToken;
      const refreshToken = reg.tokens.refreshToken;

      const res = await controller.logout(
        { headers: { authorization: `Bearer ${token}` } },
        { refreshToken }
      );

      expect(res.success).toBe(true);
      expect(res.message).toContain('revoked');

      // Subsequent refresh attempt must fail
      await expect(controller.refreshToken({ refreshToken })).rejects.toThrow();
    });
  });
});


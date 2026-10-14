import { describe, it, expect, beforeEach } from 'vitest';
import { AuthController } from './auth.controller';
import {
  AuthenticationService,
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
  let jwtService: JwtSecurityService;

  beforeEach(() => {
    const passwordHasher = new Argon2PasswordHasher();
    jwtService = new JwtSecurityService('test_api_jwt_secret_velupi_2026');
    authService = new AuthenticationService(passwordHasher, jwtService);
    controller = new AuthController(authService);
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
});

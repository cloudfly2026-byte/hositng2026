import { describe, it, expect, beforeEach } from 'vitest';
import {
  AuthenticationService,
  InvalidCredentialsError,
  SessionRevokedError,
  InvalidResetTokenError,
} from './auth-service';
import { DuplicateEmailError, InvalidVerificationTokenError } from '../commerce/onboarding-order';
import { Argon2PasswordHasher, JwtSecurityService } from './password-hasher';

describe('AuthenticationService (End-to-End Identity & Auth)', () => {
  let authService: AuthenticationService;
  let passwordHasher: Argon2PasswordHasher;
  let jwtService: JwtSecurityService;

  beforeEach(() => {
    passwordHasher = new Argon2PasswordHasher();
    jwtService = new JwtSecurityService('test_jwt_secret_key_velupi_2026_spec');
    authService = new AuthenticationService(passwordHasher, jwtService);
  });

  describe('Registration & Password Hashing', () => {
    it('registers a new user with Argon2id hashed password and creates organization', async () => {
      const result = await authService.register({
        email: 'developer@velupi.com',
        password: 'SecurePassword2026!',
        fullName: 'Dev Lead',
        organizationName: 'Velupi Tech',
      });

      expect(result.user.id).toBeTruthy();
      expect(result.user.email).toBe('developer@velupi.com');
      expect(result.user.emailVerified).toBe(false);
      expect(result.organization.id).toBeTruthy();
      expect(result.organization.name).toBe('Velupi Tech');
      expect(result.verificationToken).toBeTruthy();
      expect(result.tokens.accessToken).toBeTruthy();
      expect(result.tokens.refreshToken).toBeTruthy();
      expect(result.tokens.tokenType).toBe('Bearer');
      expect(result.tokens.expiresIn).toBe(900); // 15 mins

      // Invariant: No password or passwordHash leaked in user object
      expect((result.user as any).password).toBeUndefined();
      expect((result.user as any).passwordHash).toBeUndefined();
    });

    it('rejects registration with duplicate email', async () => {
      await authService.register({
        email: 'test@velupi.com',
        password: 'Password123!',
        fullName: 'User One',
        organizationName: 'Org One',
      });

      await expect(
        authService.register({
          email: 'test@velupi.com',
          password: 'AnotherPassword456!',
          fullName: 'User Two',
          organizationName: 'Org Two',
        })
      ).rejects.toThrow(DuplicateEmailError);
    });
  });

  describe('Email Verification', () => {
    it('verifies user email using valid verification token', async () => {
      const reg = await authService.register({
        email: 'verify@velupi.com',
        password: 'Password123!',
        fullName: 'Verify User',
        organizationName: 'Verify Org',
      });

      const verifyResult = await authService.verifyEmail(reg.user.id, reg.verificationToken);
      expect(verifyResult.emailVerified).toBe(true);

      // Re-verification with same token fails
      await expect(authService.verifyEmail(reg.user.id, reg.verificationToken)).rejects.toThrow(
        InvalidVerificationTokenError
      );
    });

    it('rejects email verification with invalid token', async () => {
      const reg = await authService.register({
        email: 'invalid-verify@velupi.com',
        password: 'Password123!',
        fullName: 'Invalid Token User',
        organizationName: 'Token Org',
      });

      await expect(authService.verifyEmail(reg.user.id, 'wrong-token-123')).rejects.toThrow(
        InvalidVerificationTokenError
      );
    });
  });

  describe('Login & Session Creation', () => {
    it('authenticates user with valid credentials using Argon2id verification', async () => {
      await authService.register({
        email: 'login@velupi.com',
        password: 'CorrectPassword2026!',
        fullName: 'Login User',
        organizationName: 'Login Org',
      });

      const loginResult = await authService.login({
        email: 'login@velupi.com',
        password: 'CorrectPassword2026!',
      });

      expect(loginResult.user.email).toBe('login@velupi.com');
      expect(loginResult.organization.name).toBe('Login Org');
      expect(loginResult.tokens.accessToken).toBeTruthy();
      expect(loginResult.tokens.refreshToken).toBeTruthy();

      // Verify the JWT token can be decoded by JwtSecurityService
      const verified = jwtService.verify(loginResult.tokens.accessToken);
      expect(verified.userId).toBe(loginResult.user.id);
      expect(verified.organizationId).toBe(loginResult.organization.id);
      expect(verified.roles).toContain('OWNER');
    });

    it('rejects authentication with incorrect password', async () => {
      await authService.register({
        email: 'badpass@velupi.com',
        password: 'RightPassword123!',
        fullName: 'User',
        organizationName: 'Org',
      });

      await expect(
        authService.login({
          email: 'badpass@velupi.com',
          password: 'WrongPassword999!',
        })
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it('rejects authentication for non-existent email', async () => {
      await expect(
        authService.login({
          email: 'nonexistent@velupi.com',
          password: 'AnyPassword!',
        })
      ).rejects.toThrow(InvalidCredentialsError);
    });
  });

  describe('Session Renewal & Revocation (Refresh Tokens)', () => {
    it('renews access token using a valid refresh token', async () => {
      const reg = await authService.register({
        email: 'refresh@velupi.com',
        password: 'Password123!',
        fullName: 'Refresh User',
        organizationName: 'Refresh Org',
      });

      const refreshed = await authService.refreshToken(reg.tokens.refreshToken);
      expect(refreshed.accessToken).toBeTruthy();
      expect(refreshed.refreshToken).toBeTruthy();
      expect(refreshed.expiresIn).toBe(900);

      // Old refresh token is rotated and cannot be reused
      await expect(authService.refreshToken(reg.tokens.refreshToken)).rejects.toThrow(
        SessionRevokedError
      );
    });

    it('revokes session on logout, invalidating subsequent refresh attempts', async () => {
      const login = await authService.register({
        email: 'logout@velupi.com',
        password: 'Password123!',
        fullName: 'Logout User',
        organizationName: 'Logout Org',
      });

      const revokeResult = await authService.revokeSession(login.tokens.refreshToken);
      expect(revokeResult.success).toBe(true);

      await expect(authService.refreshToken(login.tokens.refreshToken)).rejects.toThrow(
        SessionRevokedError
      );
    });

    it('revokes access token upon logout and rejects subsequent usage', async () => {
      const reg = await authService.register({
        email: 'logout-access@velupi.com',
        password: 'Password123!',
        fullName: 'Logout Access User',
        organizationName: 'Logout Org',
      });

      expect(await authService.isTokenRevoked(reg.tokens.accessToken)).toBe(false);

      await authService.logout(reg.tokens.accessToken, reg.tokens.refreshToken);

      expect(await authService.isTokenRevoked(reg.tokens.accessToken)).toBe(true);
      await expect(authService.refreshToken(reg.tokens.refreshToken)).rejects.toThrow(SessionRevokedError);
    });

    it('preserves revocation state across NestJS process restarts via persistent revocation store', async () => {
      const { SharedMemoryTokenRevocationStore } = await import('./auth-service');
      const sharedStore = new SharedMemoryTokenRevocationStore();

      // Instance 1
      const instance1 = new AuthenticationService(passwordHasher, jwtService, undefined, sharedStore);
      const reg = await instance1.register({
        email: 'restart-test@velupi.com',
        password: 'Password123!',
        fullName: 'Restart User',
        organizationName: 'Restart Org',
      });

      // User logs out on Instance 1
      await instance1.logout(reg.tokens.accessToken, reg.tokens.refreshToken);
      expect(await instance1.isTokenRevoked(reg.tokens.accessToken)).toBe(true);

      // Simulate NestJS restart: snapshot persistent store state & spin up new service instance
      const persistedState = sharedStore.exportState();
      const rebootedStore = new SharedMemoryTokenRevocationStore();
      rebootedStore.importState(persistedState);

      const instance2AfterReboot = new AuthenticationService(
        passwordHasher,
        jwtService,
        undefined,
        rebootedStore
      );

      // Token remains revoked after reboot
      expect(await instance2AfterReboot.isTokenRevoked(reg.tokens.accessToken)).toBe(true);
    });

    it('shares revocation state across multiple API replicas in real time', async () => {
      const { SharedMemoryTokenRevocationStore } = await import('./auth-service');
      // Shared store acting as Redis / central distributed store
      const centralStore = new SharedMemoryTokenRevocationStore();

      // Replica A and Replica B
      const replicaA = new AuthenticationService(passwordHasher, jwtService, undefined, centralStore);
      const replicaB = new AuthenticationService(passwordHasher, jwtService, undefined, centralStore);

      const reg = await replicaA.register({
        email: 'cluster-user@velupi.com',
        password: 'Password123!',
        fullName: 'Cluster User',
        organizationName: 'Cluster Org',
      });

      // Initially neither replica sees it revoked
      expect(await replicaA.isTokenRevoked(reg.tokens.accessToken)).toBe(false);
      expect(await replicaB.isTokenRevoked(reg.tokens.accessToken)).toBe(false);

      // User calls logout on Replica A
      await replicaA.logout(reg.tokens.accessToken);

      // Replica B immediately acknowledges token is revoked
      expect(await replicaB.isTokenRevoked(reg.tokens.accessToken)).toBe(true);
    });

    it('detects refresh token reuse after rotation and invalidates the entire session family (RFC 6749 / OAuth 2.0)', async () => {
      const reg = await authService.register({
        email: 'theft-victim@velupi.com',
        password: 'Password123!',
        fullName: 'Theft Victim',
        organizationName: 'Victim Org',
      });

      const tokenR1 = reg.tokens.refreshToken;

      // Legitimate user rotates R1 -> gets R2
      const tokensV2 = await authService.refreshToken(tokenR1);
      const tokenR2 = tokensV2.refreshToken;
      expect(tokenR2).toBeTruthy();
      expect(tokenR2).not.toBe(tokenR1);

      // Legitimate user rotates R2 -> gets R3
      const tokensV3 = await authService.refreshToken(tokenR2);
      const tokenR3 = tokensV3.refreshToken;
      expect(tokenR3).toBeTruthy();

      // Attacker attempts to reuse consumed token R1 (Replay / Token Theft!)
      await expect(authService.refreshToken(tokenR1)).rejects.toThrow(SessionRevokedError);

      // Critical Invariant: Reuse detection must immediately revoke all active sessions in the family (including R3!)
      await expect(authService.refreshToken(tokenR3)).rejects.toThrow(SessionRevokedError);
    });
  });

  describe('Password Recovery (Forgot / Reset Password)', () => {
    it('generates reset token and allows updating password', async () => {
      await authService.register({
        email: 'reset@velupi.com',
        password: 'OldPassword123!',
        fullName: 'Reset User',
        organizationName: 'Reset Org',
      });

      const { resetToken } = await authService.forgotPassword('reset@velupi.com');
      expect(resetToken).toBeTruthy();

      const resetResult = await authService.resetPassword(resetToken, 'NewSecurePassword2026!');
      expect(resetResult.success).toBe(true);

      // Old password should now fail
      await expect(
        authService.login({
          email: 'reset@velupi.com',
          password: 'OldPassword123!',
        })
      ).rejects.toThrow(InvalidCredentialsError);

      // New password succeeds
      const newLogin = await authService.login({
        email: 'reset@velupi.com',
        password: 'NewSecurePassword2026!',
      });
      expect(newLogin.user.email).toBe('reset@velupi.com');
    });

    it('rejects password reset with invalid token', async () => {
      await expect(
        authService.resetPassword('invalid-token-xyz', 'NewPassword123!')
      ).rejects.toThrow(InvalidResetTokenError);
    });
  });

  describe('Operator Separation & Cross-Tenant Access', () => {
    it('ensures regular customer users do NOT have operator status', async () => {
      const reg = await authService.register({
        email: 'customer@velupi.com',
        password: 'Password123!',
        fullName: 'Customer User',
        organizationName: 'Customer Org',
      });

      const context = jwtService.verify(reg.tokens.accessToken);
      expect(context.isOperator).toBe(false);
    });

    it('creates dedicated platform operator with separate operator privileges', async () => {
      const operatorLogin = await authService.createOperator({
        email: 'operator@velupi.com',
        password: 'SuperAdminSecret2026!',
        fullName: 'Platform Operator',
      });

      const context = jwtService.verify(operatorLogin.tokens.accessToken);
      expect(context.isOperator).toBe(true);
      expect(context.roles).toContain('OWNER');
    });
  });

  describe('Relational Persistence / IUnitOfWork Integration', () => {
    it('persists registered users, organizations, and memberships into IUnitOfWork', async () => {
      const savedUsers: any[] = [];
      const savedOrgs: any[] = [];
      const savedMemberships: any[] = [];

      const mockUow: any = {
        users: {
          save: async (u: any) => { savedUsers.push(u); },
          findById: async () => null,
          findByEmail: async () => null,
          delete: async () => {},
        },
        organizations: {
          save: async (o: any) => { savedOrgs.push(o); },
          findById: async () => null,
          findBySlug: async () => null,
          listByUser: async () => [],
        },
        memberships: {
          save: async (m: any) => { savedMemberships.push(m); },
          findById: async () => null,
          findByUserAndOrg: async () => null,
          listByOrganization: async () => [],
          delete: async () => {},
        },
      };

      const authWithUow = new AuthenticationService(passwordHasher, jwtService, mockUow);
      const reg = await authWithUow.register({
        email: 'persistent.user@velupi.com',
        password: 'PersistentPassword123!',
        fullName: 'Persistent User',
        organizationName: 'Persistent Org',
      });

      expect(savedUsers.length).toBe(1);
      expect(savedUsers[0].email).toBe('persistent.user@velupi.com');
      expect(savedOrgs.length).toBe(1);
      expect(savedOrgs[0].name).toBe('Persistent Org');
      expect(savedMemberships.length).toBe(1);
      expect(savedMemberships[0].role).toBe('OWNER');
      expect(reg.user.email).toBe('persistent.user@velupi.com');
    });
  });
});

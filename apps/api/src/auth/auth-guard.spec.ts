import { describe, it, expect, beforeEach } from 'vitest';
import { ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtSecurityService, Argon2PasswordHasher } from '@cloudfly/domain';
import { JwtAuthGuard } from './jwt-auth.guard';
import { HttpTenantGuard } from './tenant.guard';
import { HttpRolesGuard } from './roles.guard';

function mockExecutionContext(request: Record<string, any>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => () => {},
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

describe('Authentication & Authorization Security Guards (TDD)', () => {
  let jwtService: JwtSecurityService;
  let jwtGuard: JwtAuthGuard;
  let tenantGuard: HttpTenantGuard;
  let rolesGuard: HttpRolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    jwtService = new JwtSecurityService('test_secret_for_auth_guard_suite');
    jwtGuard = new JwtAuthGuard();
    // Injected with same secret
    (jwtGuard as any).jwtService = jwtService;
    tenantGuard = new HttpTenantGuard();
    reflector = new Reflector();
    rolesGuard = new HttpRolesGuard(reflector);
  });

  describe('Unauthenticated Access Prevention', () => {
    it('should throw UnauthorizedException when no Authorization header is present', async () => {
      const context = mockExecutionContext({ headers: {} });
      await expect(jwtGuard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when Authorization header is malformed', async () => {
      const context = mockExecutionContext({ headers: { authorization: 'Basic some-base64' } });
      await expect(jwtGuard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token signature is invalid or tampered', async () => {
      const validToken = jwtService.sign({
        sub: 'usr-1',
        email: 'attacker@velupi.com',
        organizationId: 'org-tenant-a',
        roles: ['VIEWER'],
      });

      const tamperedToken = validToken.substring(0, validToken.length - 5) + 'xxxxx';
      const context = mockExecutionContext({ headers: { authorization: `Bearer ${tamperedToken}` } });

      await expect(jwtGuard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should attach authenticated user context to request when token is valid', async () => {
      const validToken = jwtService.sign({
        sub: 'usr-owner-1',
        email: 'owner@velupi.com',
        organizationId: 'org-tenant-a',
        roles: ['OWNER'],
      });

      const req: Record<string, any> = { headers: { authorization: `Bearer ${validToken}` } };
      const context = mockExecutionContext(req);

      const result = await jwtGuard.canActivate(context);
      expect(result).toBe(true);
      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe('usr-owner-1');
      expect(req.user.organizationId).toBe('org-tenant-a');
      expect(req.user.roles).toContain('OWNER');
    });
  });

  describe('Cross-Tenant Access Boundary (TenantGuard)', () => {
    it('should throw ForbiddenException when user from Tenant A tries to access Tenant B route', () => {
      const req = {
        user: {
          userId: 'usr-tenant-a',
          organizationId: 'org-tenant-a',
          roles: ['OWNER'] as any,
          permissions: [],
          email: 'user@tenant-a.com',
        },
        params: {
          organizationId: 'org-tenant-b', // Cross-tenant target
        },
      };

      const context = mockExecutionContext(req);
      expect(() => tenantGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow user accessing resources within their own tenant', () => {
      const req = {
        user: {
          userId: 'usr-tenant-a',
          organizationId: 'org-tenant-a',
          roles: ['ADMIN'] as any,
          permissions: [],
          email: 'admin@tenant-a.com',
        },
        params: {
          organizationId: 'org-tenant-a', // Own tenant
        },
      };

      const context = mockExecutionContext(req);
      expect(tenantGuard.canActivate(context)).toBe(true);
    });
  });

  describe('Privilege Escalation Prevention (RolesGuard)', () => {
    it('should throw ForbiddenException when a VIEWER attempts an OWNER/ADMIN endpoint', () => {
      const req = {
        user: {
          userId: 'usr-viewer-1',
          organizationId: 'org-tenant-a',
          roles: ['VIEWER'] as any,
          permissions: [],
          email: 'viewer@tenant-a.com',
        },
      };

      // Mock endpoint requires OWNER or ADMIN
      reflector.getAllAndOverride = () => ['OWNER', 'ADMIN'] as any;
      const context = mockExecutionContext(req);

      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow access when user role matches required roles', () => {
      const req = {
        user: {
          userId: 'usr-admin-1',
          organizationId: 'org-tenant-a',
          roles: ['ADMIN'] as any,
          permissions: [],
          email: 'admin@tenant-a.com',
        },
      };

      reflector.getAllAndOverride = () => ['OWNER', 'ADMIN'] as any;
      const context = mockExecutionContext(req);

      expect(rolesGuard.canActivate(context)).toBe(true);
    });
  });

  describe('Argon2 Password Hashing & Verification', () => {
    const hasher = new Argon2PasswordHasher();

    it('should generate an argon2id modular crypt format hash', async () => {
      const rawPassword = 'SuperSecurePassword2026!';
      const hash = await hasher.hash(rawPassword);

      expect(hash).toContain('$argon2id$v=19$');
      expect(hash.split('$').length).toBeGreaterThanOrEqual(5);
    });

    it('should verify matching password and reject incorrect password', async () => {
      const rawPassword = 'VelupiDevOpsPass#2026';
      const hash = await hasher.hash(rawPassword);

      const isValid = await hasher.verify(rawPassword, hash);
      expect(isValid).toBe(true);

      const isInvalid = await hasher.verify('WrongPassword', hash);
      expect(isInvalid).toBe(false);
    });
  });
});

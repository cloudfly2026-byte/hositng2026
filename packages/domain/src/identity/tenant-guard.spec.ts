import { describe, it, expect } from 'vitest';
import { TenantAccessPolicy } from './tenant-guard';
import { AuthorizedContext } from '@cloudfly/contracts';

describe('TenantAccessPolicy (Identity & Tenancy Guard)', () => {
  it('denies access when context organization does not match target organization (Cross-Tenant isolation)', () => {
    const orgAContext: AuthorizedContext = {
      userId: 'user-001',
      organizationId: 'org-A-uuid',
      roles: ['OWNER'],
      permissions: ['read', 'write', 'deploy'],
    };

    const targetOrgB = 'org-B-uuid';

    const canAccess = TenantAccessPolicy.canAccessTenant(orgAContext, targetOrgB);
    expect(canAccess).toBe(false);
  });

  it('allows access when context organization matches target organization', () => {
    const orgAContext: AuthorizedContext = {
      userId: 'user-001',
      organizationId: 'org-A-uuid',
      roles: ['OWNER'],
      permissions: ['read', 'write', 'deploy'],
    };

    const canAccess = TenantAccessPolicy.canAccessTenant(orgAContext, 'org-A-uuid');
    expect(canAccess).toBe(true);
  });

  it('denies deployment if member does not have deploy permission', () => {
    const viewerContext: AuthorizedContext = {
      userId: 'user-002',
      organizationId: 'org-A-uuid',
      roles: ['VIEWER'],
      permissions: ['read'],
    };

    const canDeploy = TenantAccessPolicy.hasPermission(viewerContext, 'deploy');
    expect(canDeploy).toBe(false);
  });

  it('permits deployment when member has deploy permission', () => {
    const devContext: AuthorizedContext = {
      userId: 'user-003',
      organizationId: 'org-A-uuid',
      roles: ['DEVELOPER'],
      permissions: ['read', 'write', 'deploy'],
    };

    const canDeploy = TenantAccessPolicy.hasPermission(devContext, 'deploy');
    expect(canDeploy).toBe(true);
  });

  describe('Multi-Tenant Cross-Access Isolation (Commerce, Operations & Assets)', () => {
    const tenantAlphaContext: AuthorizedContext = {
      userId: 'usr-alpha-01',
      organizationId: 'org-alpha',
      roles: ['OWNER'],
      permissions: ['read', 'write', 'deploy', 'billing', 'admin'],
    };

    it('strictly isolates orders and invoices across distinct tenants', () => {
      const orderOrgBeta = 'org-beta';
      expect(TenantAccessPolicy.canAccessTenant(tenantAlphaContext, orderOrgBeta)).toBe(false);
    });

    it('strictly isolates DNS zones and records across distinct tenants', () => {
      const dnsZoneOrgBeta = 'org-beta';
      expect(TenantAccessPolicy.canAccessTenant(tenantAlphaContext, dnsZoneOrgBeta)).toBe(false);
    });

    it('strictly isolates Cloud Apps, Docker services and projects across distinct tenants', () => {
      const appOrgBeta = 'org-beta';
      expect(TenantAccessPolicy.canAccessTenant(tenantAlphaContext, appOrgBeta)).toBe(false);
    });

    it('strictly isolates hosting domains and database resources across distinct tenants', () => {
      const hostingOrgBeta = 'org-beta';
      expect(TenantAccessPolicy.canAccessTenant(tenantAlphaContext, hostingOrgBeta)).toBe(false);
    });

    it('prevents role escalation from VIEWER to billing or deployment operations', () => {
      const viewerContext: AuthorizedContext = {
        userId: 'usr-alpha-viewer',
        organizationId: 'org-alpha',
        roles: ['VIEWER'],
        permissions: ['read'],
      };

      expect(TenantAccessPolicy.hasPermission(viewerContext, 'billing')).toBe(false);
      expect(TenantAccessPolicy.hasPermission(viewerContext, 'deploy')).toBe(false);
      expect(TenantAccessPolicy.hasPermission(viewerContext, 'admin')).toBe(false);
      expect(TenantAccessPolicy.hasPermission(viewerContext, 'read')).toBe(true);
    });
  });
});


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
});

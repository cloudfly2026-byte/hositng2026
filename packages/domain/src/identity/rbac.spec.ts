import { describe, it, expect } from 'vitest';
import {
  Organization,
  User,
  Membership,
  RbacPolicy,
  Permission,
  ForbiddenActionError,
  CrossTenantViolationError,
  AuditLogger,
} from './rbac';

describe('Epic A2 - RBAC, Tenancy & Audit', () => {
  const orgA: Organization = {
    id: 'org-100',
    name: 'Acme Corp',
    slug: 'acme-corp',
    createdAt: new Date('2026-01-01'),
  };

  const orgB: Organization = {
    id: 'org-200',
    name: 'Beta LLC',
    slug: 'beta-llc',
    createdAt: new Date('2026-01-01'),
  };

  const userOwner: User = {
    id: 'user-01',
    email: 'owner@acme.com',
    name: 'Alice Owner',
    createdAt: new Date('2026-01-01'),
  };

  const userDev: User = {
    id: 'user-02',
    email: 'dev@acme.com',
    name: 'Bob Dev',
    createdAt: new Date('2026-01-01'),
  };

  const userViewer: User = {
    id: 'user-03',
    email: 'viewer@acme.com',
    name: 'Charlie Viewer',
    createdAt: new Date('2026-01-01'),
  };

  const memberships: Membership[] = [
    {
      id: 'm-1',
      userId: userOwner.id,
      organizationId: orgA.id,
      role: 'OWNER',
      createdAt: new Date(),
    },
    {
      id: 'm-2',
      userId: userDev.id,
      organizationId: orgA.id,
      role: 'DEVELOPER',
      createdAt: new Date(),
    },
    {
      id: 'm-3',
      userId: userViewer.id,
      organizationId: orgA.id,
      role: 'VIEWER',
      linkedHestiaUser: 'admin_hestia_user', // Hestia CP user linked
      createdAt: new Date(),
    },
  ];

  it('allows OWNER to perform all operations including billing and member management', () => {
    const ownerMembership = memberships.find((m) => m.userId === userOwner.id)!;
    expect(RbacPolicy.hasPermission(ownerMembership, Permission.DEPLOY)).toBe(true);
    expect(RbacPolicy.hasPermission(ownerMembership, Permission.MANAGE_BILLING)).toBe(true);
    expect(RbacPolicy.hasPermission(ownerMembership, Permission.MANAGE_MEMBERS)).toBe(true);
  });

  it('allows DEVELOPER to deploy and read logs, but denies billing and member management', () => {
    const devMembership = memberships.find((m) => m.userId === userDev.id)!;
    expect(RbacPolicy.hasPermission(devMembership, Permission.DEPLOY)).toBe(true);
    expect(RbacPolicy.hasPermission(devMembership, Permission.READ_LOGS)).toBe(true);
    expect(RbacPolicy.hasPermission(devMembership, Permission.MANAGE_BILLING)).toBe(false);
    expect(RbacPolicy.hasPermission(devMembership, Permission.MANAGE_MEMBERS)).toBe(false);
  });

  it('denies VIEWER from deploying or managing members, even with a linked HestiaCP account', () => {
    const viewerMembership = memberships.find((m) => m.userId === userViewer.id)!;
    expect(viewerMembership.linkedHestiaUser).toBeDefined();

    // The HestiaCP link must NEVER grant platform permissions beyond the platform role
    expect(RbacPolicy.hasPermission(viewerMembership, Permission.DEPLOY)).toBe(false);
    expect(RbacPolicy.hasPermission(viewerMembership, Permission.MANAGE_MEMBERS)).toBe(false);
    expect(RbacPolicy.hasPermission(viewerMembership, Permission.READ_RESOURCES)).toBe(true);
  });

  it('throws ForbiddenActionError when an unauthorized action is asserted', () => {
    const viewerMembership = memberships.find((m) => m.userId === userViewer.id)!;
    expect(() => {
      RbacPolicy.assertPermission(viewerMembership, Permission.DEPLOY);
    }).toThrow(ForbiddenActionError);
  });

  it('throws CrossTenantViolationError when accessing resources of a different organization', () => {
    const devMembership = memberships.find((m) => m.userId === userDev.id)!;
    expect(() => {
      RbacPolicy.assertTenantMatch(devMembership, orgB.id);
    }).toThrow(CrossTenantViolationError);
  });

  it('records an AuditEvent with tenant scope and actor details', () => {
    const auditLogger = new AuditLogger();
    const event = auditLogger.log({
      organizationId: orgA.id,
      actorUserId: userDev.id,
      action: 'SERVICE_DEPLOY_REQUESTED',
      resource: 'service-456',
      metadata: { runtime: 'nodejs-20' },
    });

    expect(event.id).toBeDefined();
    expect(event.organizationId).toBe(orgA.id);
    expect(event.actorUserId).toBe(userDev.id);
    expect(event.timestamp).toBeInstanceOf(Date);
    expect(auditLogger.getEventsForTenant(orgA.id)).toHaveLength(1);
    expect(auditLogger.getEventsForTenant(orgB.id)).toHaveLength(0);
  });
});

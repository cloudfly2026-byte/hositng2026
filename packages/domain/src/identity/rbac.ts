import { Role } from '@cloudfly/contracts';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
}

export interface Membership {
  id: string;
  userId: string;
  organizationId: string;
  role: Role;
  linkedHestiaUser?: string;
  createdAt: Date;
}

export enum Permission {
  READ_RESOURCES = 'READ_RESOURCES',
  READ_LOGS = 'READ_LOGS',
  DEPLOY = 'DEPLOY',
  RESTART = 'RESTART',
  MANAGE_MEMBERS = 'MANAGE_MEMBERS',
  MANAGE_BILLING = 'MANAGE_BILLING',
  MANAGE_ORGANIZATION = 'MANAGE_ORGANIZATION',
}

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  OWNER: [
    Permission.READ_RESOURCES,
    Permission.READ_LOGS,
    Permission.DEPLOY,
    Permission.RESTART,
    Permission.MANAGE_MEMBERS,
    Permission.MANAGE_BILLING,
    Permission.MANAGE_ORGANIZATION,
  ],
  ADMIN: [
    Permission.READ_RESOURCES,
    Permission.READ_LOGS,
    Permission.DEPLOY,
    Permission.RESTART,
    Permission.MANAGE_MEMBERS,
  ],
  DEVELOPER: [
    Permission.READ_RESOURCES,
    Permission.READ_LOGS,
    Permission.DEPLOY,
    Permission.RESTART,
  ],
  VIEWER: [
    Permission.READ_RESOURCES,
    Permission.READ_LOGS,
  ],
};

export class ForbiddenActionError extends Error {
  constructor(permission: Permission, role: Role) {
    super(`Role '${role}' is not granted permission '${permission}'`);
    this.name = 'ForbiddenActionError';
  }
}

export class CrossTenantViolationError extends Error {
  constructor(contextOrgId: string, targetOrgId: string) {
    super(`Cross-tenant violation: caller tenant '${contextOrgId}' cannot access resource in tenant '${targetOrgId}'`);
    this.name = 'CrossTenantViolationError';
  }
}

export class RbacPolicy {
  /**
   * Evaluates if a membership grants a specific permission.
   * Note: linkedHestiaUser never overrides or elevates platform permissions.
   */
  static hasPermission(membership: Membership, permission: Permission): boolean {
    if (!membership || !membership.role) {
      return false;
    }
    const permissions = ROLE_PERMISSIONS[membership.role] || [];
    return permissions.includes(permission);
  }

  /**
   * Asserts permission, throwing ForbiddenActionError if denied.
   */
  static assertPermission(membership: Membership, permission: Permission): void {
    if (!this.hasPermission(membership, permission)) {
      throw new ForbiddenActionError(permission, membership.role);
    }
  }

  /**
   * Asserts that the caller membership belongs to the target organization.
   */
  static assertTenantMatch(membership: Membership, targetOrgId: string): void {
    if (!membership || membership.organizationId !== targetOrgId) {
      throw new CrossTenantViolationError(membership?.organizationId ?? 'unknown', targetOrgId);
    }
  }
}

export interface AuditEvent {
  id: string;
  organizationId: string;
  actorUserId: string;
  action: string;
  resource: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export class AuditLogger {
  private events: AuditEvent[] = [];

  log(data: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
    const event: AuditEvent = {
      ...data,
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date(),
    };
    this.events.push(event);
    return event;
  }

  getEventsForTenant(organizationId: string): AuditEvent[] {
    return this.events.filter((e) => e.organizationId === organizationId);
  }
}

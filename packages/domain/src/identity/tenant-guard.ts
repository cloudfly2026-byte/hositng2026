import { AuthorizedContext } from '@cloudfly/contracts';

export class TenantAccessPolicy {
  /**
   * Enforces cross-tenant isolation.
   * Access is strictly permitted only if the context organizationId matches the target organizationId.
   */
  static canAccessTenant(context: AuthorizedContext, targetOrgId: string): boolean {
    if (!context || !context.organizationId || !targetOrgId) {
      return false;
    }
    return context.organizationId === targetOrgId;
  }

  /**
   * Verifies if the context has the requested action permission.
   */
  static hasPermission(context: AuthorizedContext, permission: string): boolean {
    if (!context || !context.permissions) {
      return false;
    }
    return context.permissions.includes(permission);
  }
}

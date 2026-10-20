import {
  Permissions,
  Role,
  PlatformRole,
  EffectiveCapabilities,
} from '@cloudfly/contracts';
import { ProductCatalogService, ProductCategory } from '../commerce/catalog';

export const CAPABILITIES_CATALOG_VERSION = '2026.1';

export interface SubscriptionContextItem {
  status: string;
  planCode?: string;
  planVersionId?: string;
  planCategory?: string;
  features?: string[];
}

export interface AccessEvaluationContext {
  userId: string;
  organizationId: string;
  membership?: {
    role: Role;
    organizationId: string;
  };
  permission: string;
  targetResource?: {
    organizationId: string;
    ownerUserId?: string;
    resourceType?: string;
  };
  subscriptions?: SubscriptionContextItem[];
  entitlements?: Array<{
    status: string;
    quotas?: Record<string, any>;
  }>;
  isOperator?: boolean;
  platformRole?: PlatformRole;
}

export interface AccessDecision {
  granted: boolean;
  reason?: string;
}

export interface CapabilitiesQueryContext {
  userId: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    isInternalPilot: boolean;
  };
  role: Role;
  subscriptions?: SubscriptionContextItem[];
  entitlements?: Array<{
    status: string;
    quotas?: Record<string, any>;
  }>;
  isOperator?: boolean;
  platformRole?: PlatformRole;
}

const ROLE_BASE_PERMISSIONS: Record<Role, readonly string[]> = {
  OWNER: [
    Permissions.HOSTING_READ,
    Permissions.HOSTING_MANAGE,
    Permissions.DNS_READ,
    Permissions.DNS_MANAGE,
    Permissions.APPS_READ,
    Permissions.APPS_DEPLOY,
    Permissions.DATABASES_MANAGE,
    Permissions.FILES_MANAGE,
    Permissions.EMAILS_MANAGE,
    Permissions.SSL_MANAGE,
    Permissions.BACKUPS_MANAGE,
    Permissions.GATEWAY_MANAGE,
    Permissions.STUDIO_ACCESS,
    Permissions.PROJECTS_READ,
    Permissions.PROJECTS_MANAGE,
    Permissions.MEMBERS_MANAGE,
    Permissions.BILLING_READ,
    Permissions.BILLING_MANAGE,
    Permissions.AUDIT_READ,
  ],
  ADMIN: [
    Permissions.HOSTING_READ,
    Permissions.HOSTING_MANAGE,
    Permissions.DNS_READ,
    Permissions.DNS_MANAGE,
    Permissions.APPS_READ,
    Permissions.APPS_DEPLOY,
    Permissions.DATABASES_MANAGE,
    Permissions.FILES_MANAGE,
    Permissions.EMAILS_MANAGE,
    Permissions.SSL_MANAGE,
    Permissions.BACKUPS_MANAGE,
    Permissions.GATEWAY_MANAGE,
    Permissions.STUDIO_ACCESS,
    Permissions.PROJECTS_READ,
    Permissions.PROJECTS_MANAGE,
    Permissions.MEMBERS_MANAGE,
    Permissions.AUDIT_READ,
  ],
  DEVELOPER: [
    Permissions.HOSTING_READ,
    Permissions.HOSTING_MANAGE,
    Permissions.DNS_READ,
    Permissions.DNS_MANAGE,
    Permissions.APPS_READ,
    Permissions.APPS_DEPLOY,
    Permissions.DATABASES_MANAGE,
    Permissions.FILES_MANAGE,
    Permissions.SSL_MANAGE,
    Permissions.GATEWAY_MANAGE,
    Permissions.STUDIO_ACCESS,
    Permissions.PROJECTS_READ,
    Permissions.PROJECTS_MANAGE,
    Permissions.AUDIT_READ,
  ],
  VIEWER: [
    Permissions.HOSTING_READ,
    Permissions.DNS_READ,
    Permissions.APPS_READ,
    Permissions.PROJECTS_READ,
    Permissions.AUDIT_READ,
  ],
  SUPER_ADMIN: [
    Permissions.PLATFORM_NODES_MANAGE,
    Permissions.PLATFORM_QUEUES_MANAGE,
    Permissions.PLATFORM_AUDIT_READ,
    Permissions.PLATFORM_CONFIG_MANAGE,
    Permissions.PLATFORM_TENANTS_MANAGE,
    Permissions.PLATFORM_TENANTS_READ,
    Permissions.PLATFORM_OPERATORS_MANAGE,
  ],
  OPERATOR: [
    Permissions.PLATFORM_NODES_MANAGE,
    Permissions.PLATFORM_QUEUES_MANAGE,
    Permissions.PLATFORM_AUDIT_READ,
    Permissions.PLATFORM_TENANTS_READ,
  ],
  SUPPORT: [
    Permissions.PLATFORM_TENANTS_READ,
    Permissions.PLATFORM_AUDIT_READ,
  ],
};

const MUTATING_RESTRICTED_PERMISSIONS = new Set<string>([
  Permissions.HOSTING_MANAGE,
  Permissions.DNS_MANAGE,
  Permissions.APPS_DEPLOY,
  Permissions.DATABASES_MANAGE,
  Permissions.FILES_MANAGE,
  Permissions.EMAILS_MANAGE,
  Permissions.SSL_MANAGE,
  Permissions.BACKUPS_MANAGE,
  Permissions.GATEWAY_MANAGE,
  Permissions.STUDIO_ACCESS,
  Permissions.PROJECTS_MANAGE,
]);

export class AccessPolicyService {
  constructor(private readonly catalog?: ProductCatalogService) {}

  getCatalogVersion(): string {
    return CAPABILITIES_CATALOG_VERSION;
  }

  evaluateAccess(context: AccessEvaluationContext): AccessDecision {
    const { permission, organizationId, membership, targetResource, subscriptions, isOperator } = context;

    // 1. Platform isolation check
    if (permission.startsWith('platform.')) {
      if (!isOperator || (membership && !['SUPER_ADMIN', 'OPERATOR', 'SUPPORT'].includes(membership.role))) {
        return {
          granted: false,
          reason: 'Platform permissions require platform operator credentials and role.',
        };
      }
    }

    // 2. Membership tenant match
    if (membership && membership.organizationId !== organizationId) {
      return {
        granted: false,
        reason: `Membership organization mismatch: user belongs to '${membership.organizationId}', not '${organizationId}'.`,
      };
    }

    // 3. Cross-tenant resource ownership
    if (targetResource && targetResource.organizationId && targetResource.organizationId !== organizationId) {
      return {
        granted: false,
        reason: `Cross-tenant access forbidden: resource belongs to '${targetResource.organizationId}', context is '${organizationId}'.`,
      };
    }

    // 4. Check base role permission
    const effectiveRole = membership?.role || (isOperator ? 'OPERATOR' : 'VIEWER');
    const basePermissions = ROLE_BASE_PERMISSIONS[effectiveRole] || [];
    if (!basePermissions.includes(permission)) {
      return {
        granted: false,
        reason: `Role '${effectiveRole}' lacks base permission '${permission}'.`,
      };
    }

    // 5. If it's a platform permission for operator, grant immediately
    if (permission.startsWith('platform.')) {
      return { granted: true };
    }

    // 6. Non-operational permissions (Billing & Governance) are governed by role directly
    if (
      permission.startsWith('billing.') ||
      permission.startsWith('members.') ||
      permission === Permissions.AUDIT_READ
    ) {
      return { granted: true };
    }

    // 7. Operational permissions require active subscription / plan
    const activeSubs = (subscriptions || []).filter(
      (s) => s.status === 'ACTIVE' || s.status === 'GRACE_PERIOD' || s.status === 'SUSPENDED'
    );

    if (activeSubs.length === 0) {
      const cancelledSub = (subscriptions || []).find((s) => s.status === 'CANCELLED' || s.status === 'EXPIRED');
      if (cancelledSub) {
        return {
          granted: false,
          reason: `Subscription is ${cancelledSub.status.toLowerCase()}. Operational access is revoked.`,
        };
      }
      return {
        granted: false,
        reason: 'No active plan contracted. Operational access requires an active subscription.',
      };
    }

    // 8. Suspended subscription check: Mutating operations are revoked; read-only and billing are preserved
    const isSuspended = activeSubs.every((s) => s.status === 'SUSPENDED');
    if (isSuspended) {
      if (MUTATING_RESTRICTED_PERMISSIONS.has(permission)) {
        return {
          granted: false,
          reason: 'Subscription is suspended. Restricted mutating operations are revoked until reactivated.',
        };
      }
    }

    // 9. Check product plan capability matches the requested operational permission
    const contractedCaps = this.resolveContractedCapabilities(activeSubs);
    if (!this.isPermissionCoveredByCapabilities(permission, contractedCaps)) {
      return {
        granted: false,
        reason: `Requested operation '${permission}' requires capabilities not included in active plans.`,
      };
    }

    return { granted: true };
  }

  getEffectiveCapabilities(context: CapabilitiesQueryContext): EffectiveCapabilities {
    const { organization, role, subscriptions = [], isOperator = false, platformRole } = context;

    // Separate platform operators vs tenant users
    if (isOperator || ['SUPER_ADMIN', 'OPERATOR', 'SUPPORT'].includes(role as any)) {
      const pRole = (platformRole || role) as PlatformRole;
      const permissions = [...(ROLE_BASE_PERMISSIONS[pRole] || [])];
      return {
        organization,
        role: pRole,
        permissions,
        visibleModules: [
          'dashboard',
          'admin-customers',
          'hosting',
          'files',
          'databases',
          'emails',
          'dns',
          'ssl',
          'backups',
          'apps',
          'gateway',
          'studio',
          'billing',
          'account',
          'platform-nodes',
          'platform-queues',
          'platform-audit',
          'platform-tenants',
        ],
        enabledActions: permissions.map((p) => p.replace('.', ':')),
        contractedCapabilities: ['platform_administration'],
        servicesStatus: {
          hasActivePlan: true,
          subscriptionStatus: 'ACTIVE',
          gracePeriod: false,
          suspended: false,
          activePlans: ['platform-internal'],
        },
        isOperator: true,
        platformRole: pRole,
      };
    }

    // Tenant Organization Context
    const basePermissions = [...(ROLE_BASE_PERMISSIONS[role] || [])];

    // Evaluate subscription status
    const activeSubs = subscriptions.filter(
      (s) => s.status === 'ACTIVE' || s.status === 'GRACE_PERIOD' || s.status === 'SUSPENDED'
    );
    const hasActivePlan = activeSubs.length > 0;
    const isGracePeriod = activeSubs.some((s) => s.status === 'GRACE_PERIOD');
    const isSuspended = hasActivePlan && activeSubs.every((s) => s.status === 'SUSPENDED');
    const activePlans = activeSubs.map((s) => s.planCode || 'default-plan');

    let overallSubStatus = 'NO_PLAN';
    if (isSuspended) {
      overallSubStatus = 'SUSPENDED';
    } else if (isGracePeriod) {
      overallSubStatus = 'GRACE_PERIOD';
    } else if (hasActivePlan) {
      overallSubStatus = 'ACTIVE';
    } else if (subscriptions.length > 0) {
      overallSubStatus = subscriptions[0].status;
    }

    // Resolve contracted capabilities from active subscriptions
    const contractedCapabilities = hasActivePlan ? this.resolveContractedCapabilities(activeSubs) : [];

    // Filter effective permissions
    const effectivePermissions = basePermissions.filter((perm) => {
      // Platform permissions never granted to tenant roles
      if (perm.startsWith('platform.')) return false;

      // Billing and members depend on role, always permitted if role allows
      if (perm.startsWith('billing.') || perm.startsWith('members.') || perm === Permissions.AUDIT_READ) {
        return true;
      }

      // Operational permissions require an active plan
      if (!hasActivePlan) return false;

      // If suspended, mutating operations are revoked
      if (isSuspended && MUTATING_RESTRICTED_PERMISSIONS.has(perm)) {
        return false;
      }

      // Must be covered by contracted capabilities
      return this.isPermissionCoveredByCapabilities(perm, contractedCapabilities);
    });

    // Resolve visible modules
    const visibleModules = this.resolveVisibleModules(role, contractedCapabilities, hasActivePlan);

    // Resolve granular enabled actions
    const enabledActions = effectivePermissions.map((p) => p.replace('.', ':'));

    return {
      organization,
      role,
      permissions: effectivePermissions,
      visibleModules,
      enabledActions,
      contractedCapabilities,
      servicesStatus: {
        hasActivePlan,
        subscriptionStatus: overallSubStatus,
        gracePeriod: isGracePeriod,
        suspended: isSuspended,
        activePlans,
      },
      isOperator: false,
    };
  }

  private resolveContractedCapabilities(
    subscriptions: SubscriptionContextItem[]
  ): string[] {
    const caps = new Set<string>();

    for (const sub of subscriptions) {
      let category = sub.planCategory;

      if (!category && this.catalog) {
        if (sub.planVersionId) {
          try {
            const version = this.catalog.getVersionById(sub.planVersionId);
            const plan = this.catalog.getPlanById(version.planId);
            if (plan?.product) {
              category = plan.product.category;
            }
          } catch {
            // ignore lookup failure
          }
        }
        if (!category && sub.planCode) {
          const plan = this.catalog.getPlanByCode(sub.planCode);
          if (plan?.product) {
            category = plan.product.category;
          }
        }
      }

      // Map categories to capabilities
      if (category === ProductCategory.WEB_HOSTING || category === ProductCategory.WORDPRESS || category === 'WEB_HOSTING' || category === 'WORDPRESS') {
        caps.add('web_hosting');
        caps.add('custom_domains');
        caps.add('ssl');
        caps.add('databases');
        caps.add('emails');
        caps.add('backups');
        caps.add('dns');
      } else if (category === ProductCategory.CLOUD_APPS || category === 'CLOUD_APPS') {
        caps.add('cloud_apps');
        caps.add('custom_domains');
        caps.add('gateway');
        caps.add('live_logs');
        caps.add('dns');
      } else if (category === ProductCategory.MICROSERVICES || category === ProductCategory.VPS || category === 'MICROSERVICES' || category === 'VPS') {
        caps.add('cloud_apps');
        caps.add('microservices_studio');
        caps.add('gateway');
        caps.add('databases');
        caps.add('dns');
      }

      if (sub.features) {
        sub.features.forEach((f) => caps.add(f));
      }
    }

    return Array.from(caps);
  }

  private isPermissionCoveredByCapabilities(permission: string, capabilities: string[]): boolean {
    const capSet = new Set(capabilities);

    if (permission.startsWith('hosting.') || permission === Permissions.FILES_MANAGE || permission === Permissions.EMAILS_MANAGE || permission === Permissions.SSL_MANAGE || permission === Permissions.BACKUPS_MANAGE) {
      return capSet.has('web_hosting');
    }
    if (permission.startsWith('apps.')) {
      return capSet.has('cloud_apps');
    }
    if (permission === Permissions.GATEWAY_MANAGE) {
      return capSet.has('gateway');
    }
    if (permission === Permissions.STUDIO_ACCESS) {
      return capSet.has('microservices_studio');
    }
    if (permission === Permissions.DATABASES_MANAGE) {
      return capSet.has('databases');
    }
    if (permission.startsWith('dns.')) {
      return capSet.has('dns') || capSet.has('custom_domains');
    }
    if (permission.startsWith('projects.')) {
      return capSet.has('web_hosting') || capSet.has('cloud_apps') || capSet.has('microservices_studio');
    }

    return true;
  }

  private resolveVisibleModules(role: Role, capabilities: string[], hasActivePlan: boolean): string[] {
    const modules: string[] = ['dashboard'];
    const capSet = new Set(capabilities);

    if (hasActivePlan) {
      if (capSet.has('web_hosting')) {
        modules.push('hosting', 'files', 'databases', 'emails', 'ssl', 'backups');
      }
      if (capSet.has('cloud_apps')) {
        modules.push('apps');
        if (capSet.has('gateway')) modules.push('gateway');
      }
      if (capSet.has('microservices_studio')) {
        modules.push('studio');
      }
      if (capSet.has('dns') || capSet.has('custom_domains')) {
        if (!modules.includes('dns')) modules.push('dns');
      }
      if (capSet.has('databases') && !modules.includes('databases')) {
        modules.push('databases');
      }
    }

    // Role-dependent administrative modules
    if (role === 'OWNER') {
      modules.push('billing', 'account');
    } else if (role === 'ADMIN') {
      modules.push('account');
    } else if (role === 'DEVELOPER') {
      modules.push('account');
    } else if (role === 'VIEWER') {
      modules.push('account');
    }

    return modules;
  }
}

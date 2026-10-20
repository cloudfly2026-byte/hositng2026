import { AuthService } from '../security/auth-service';
import { HostingManagementService } from '../hosting/hosting-management';
import { IUnitOfWork } from '../repositories/interfaces';

export interface DeprovisionCustomerOptions {
  email?: string;
  domain?: string;
  organizationId?: string;
  hestiaUser?: string;
}

export interface DeprovisionCustomerResult {
  success: boolean;
  purgedUserIds: string[];
  purgedOrganizationIds: string[];
  purgedDomains: string[];
  purgedHestiaUsers: string[];
  purgedMailAccounts: string[];
  message: string;
}

const PROTECTED_SYSTEM_USERS = new Set(['admin', 'manager', 'root', 'cloudfly', 'velupi']);

export class CustomerDeprovisioningService {
  constructor(
    private readonly authService: AuthService,
    private readonly hostingService?: HostingManagementService,
    private readonly uow?: IUnitOfWork,
    private readonly transport?: { executeCommand(command: string, args: string[]): Promise<any> }
  ) {}

  async deprovision(options: DeprovisionCustomerOptions): Promise<DeprovisionCustomerResult> {
    const result: DeprovisionCustomerResult = {
      success: true,
      purgedUserIds: [],
      purgedOrganizationIds: [],
      purgedDomains: [],
      purgedHestiaUsers: [],
      purgedMailAccounts: [],
      message: '',
    };

    const targetUserIds = new Set<string>();
    const targetOrgIds = new Set<string>();
    const targetDomains = new Set<string>();
    const targetHestiaUsers = new Set<string>();

    if (options.hestiaUser && !PROTECTED_SYSTEM_USERS.has(options.hestiaUser)) {
      targetHestiaUsers.add(options.hestiaUser);
    }

    if (options.domain) {
      targetDomains.add(options.domain.toLowerCase().trim());
    }

    if (options.organizationId) {
      targetOrgIds.add(options.organizationId);
    }

    // 1. Resolve user and associated entities by email
    if (options.email) {
      const normalizedEmail = options.email.toLowerCase().trim();

      // Check DB
      if (this.uow?.users) {
        try {
          const user = await this.uow.users.findByEmail(normalizedEmail);
          if (user) {
            targetUserIds.add(user.id);
          }
        } catch {}
      }

      // Check memory in authService
      if ((this.authService as any).users) {
        for (const [id, u] of (this.authService as any).users.entries()) {
          if (u.email?.toLowerCase() === normalizedEmail) {
            targetUserIds.add(id);
          }
        }
      }

      // Check for mailbox under cloudfly domain
      if (normalizedEmail.endsWith('@cloudfly.com.co')) {
        const account = normalizedEmail.split('@')[0];
        if (this.hostingService) {
          try {
            await this.hostingService.deleteMailAccount('cloudfly', 'cloudfly.com.co', account);
            result.purgedMailAccounts.push(normalizedEmail);
          } catch {}
        }
      }
    }

    // 2. Discover organizations & linked Hestia users from user memberships
    for (const userId of targetUserIds) {
      // Find organizations owned or linked in DB
      if (this.uow?.organizations) {
        try {
          const userOrgs = await this.uow.organizations.listByUser(userId);
          for (const org of userOrgs) {
            targetOrgIds.add(org.id);
          }
        } catch {}
      }

      // Find in memory memberships
      if ((this.authService as any).memberships) {
        for (const m of (this.authService as any).memberships.values()) {
          if (m.userId === userId) {
            targetOrgIds.add(m.organizationId);
            if (m.linkedHestiaUser && !PROTECTED_SYSTEM_USERS.has(m.linkedHestiaUser)) {
              targetHestiaUsers.add(m.linkedHestiaUser);
            }
          }
        }
      }
    }

    // Check memberships for all target organizations
    for (const orgId of targetOrgIds) {
      if (this.uow?.memberships) {
        try {
          const mems = await this.uow.memberships.listByOrganization(orgId);
          for (const m of mems) {
            targetUserIds.add(m.userId);
            if (m.linkedHestiaUser && !PROTECTED_SYSTEM_USERS.has(m.linkedHestiaUser)) {
              targetHestiaUsers.add(m.linkedHestiaUser);
            }
          }
        } catch {}
      }
    }

    // 3. Search Hestia for domain owner if domain was given but no hestiaUser found
    for (const domain of targetDomains) {
      if (targetHestiaUsers.size === 0 && this.transport) {
        try {
          const searchRes = await this.transport.executeCommand('v-search-domain-owner', [domain]);
          if (searchRes.returnCode === 0 && searchRes.output) {
            const owner = searchRes.output.trim();
            if (
              owner &&
              !PROTECTED_SYSTEM_USERS.has(owner) &&
              !['ok', 'success', 'true', 'false', 'error'].includes(owner.toLowerCase()) &&
              !owner.toLowerCase().includes('error')
            ) {
              targetHestiaUsers.add(owner);
            }
          }
        } catch {}
      }
    }

    // 4. Infrastructure Cleanup (Hestia)
    for (const hestiaUser of targetHestiaUsers) {
      if (this.hostingService) {
        try {
          await this.hostingService.purgeHestiaUser(hestiaUser);
          result.purgedHestiaUsers.push(hestiaUser);
        } catch {}
      }
    }

    for (const domain of targetDomains) {
      if (this.hostingService) {
        try {
          const owner = Array.from(targetHestiaUsers)[0] || 'admin';
          await this.hostingService.purgeDomain(domain, owner);
          result.purgedDomains.push(domain);
        } catch {}
      }
    }

    // 5. Database Cleanup (PostgreSQL via Unit of Work)
    for (const orgId of targetOrgIds) {
      if (this.uow?.organizations?.delete) {
        try {
          await this.uow.organizations.delete(orgId);
          result.purgedOrganizationIds.push(orgId);
        } catch {}
      }
    }

    for (const userId of targetUserIds) {
      if (this.uow?.users?.delete) {
        try {
          await this.uow.users.delete(userId);
          result.purgedUserIds.push(userId);
        } catch {}
      }
    }

    // 6. Memory Cleanup in AuthService
    if (options.email) {
      await this.authService.deleteUserByEmail(options.email);
    }
    for (const orgId of targetOrgIds) {
      if ((this.authService as any).organizations) {
        (this.authService as any).organizations.delete(orgId);
      }
    }

    result.message = `Deprovisioning completed: ${result.purgedUserIds.length} users, ${result.purgedOrganizationIds.length} orgs, ${result.purgedHestiaUsers.length} hestia users, ${result.purgedDomains.length} domains purged.`;
    return result;
  }
}

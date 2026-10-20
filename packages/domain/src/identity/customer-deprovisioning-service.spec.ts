import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomerDeprovisioningService } from './customer-deprovisioning-service';
import { AuthService } from '../security/auth-service';
import { HostingManagementService } from '../hosting/hosting-management';
import { IUnitOfWork } from '../repositories/interfaces';

describe('CustomerDeprovisioningService (Customer Decommissioning & Cleanup)', () => {
  let deprovisioningService: CustomerDeprovisioningService;
  let mockAuthService: any;
  let mockHostingService: any;
  let mockUow: any;
  let mockTransport: any;

  beforeEach(() => {
    mockTransport = {
      executeCommand: vi.fn().mockResolvedValue({ returnCode: 0, output: 'OK' }),
    };

    mockHostingService = {
      purgeDomain: vi.fn().mockResolvedValue(undefined),
      purgeHestiaUser: vi.fn().mockResolvedValue(undefined),
      deleteMailAccount: vi.fn().mockResolvedValue(undefined),
      listWebSites: vi.fn().mockResolvedValue([]),
    };

    mockAuthService = {
      users: new Map(),
      organizations: new Map(),
      memberships: new Map(),
      otpCodes: new Map(),
      deleteUserByEmail: vi.fn().mockResolvedValue(true),
    };

    mockUow = {
      users: {
        findByEmail: vi.fn(),
        findById: vi.fn(),
        delete: vi.fn().mockResolvedValue(undefined),
      },
      organizations: {
        findById: vi.fn(),
        listByUser: vi.fn().mockResolvedValue([]),
        delete: vi.fn().mockResolvedValue(undefined),
      },
      memberships: {
        listByOrganization: vi.fn().mockResolvedValue([]),
        findByUserAndOrg: vi.fn(),
        delete: vi.fn().mockResolvedValue(undefined),
      },
    };

    deprovisioningService = new CustomerDeprovisioningService(
      mockAuthService,
      mockHostingService,
      mockUow,
      mockTransport
    );
  });

  it('deprovisions customer by email including Hestia user, mailboxes, and DB records', async () => {
    const user = {
      id: 'usr-123',
      email: 'proeba1@cloudfly.com.co',
      fullName: 'Test User',
      emailVerified: true,
      createdAt: new Date(),
    };
    mockUow.users.findByEmail.mockResolvedValue(user);

    const membership = {
      id: 'mem-123',
      userId: 'usr-123',
      organizationId: 'org-123',
      role: 'OWNER',
      linkedHestiaUser: 'u_45232lpw39',
      createdAt: new Date(),
    };
    mockUow.organizations.listByUser.mockResolvedValue([{ id: 'org-123' }]);
    mockUow.memberships.listByOrganization.mockResolvedValue([membership]);

    const result = await deprovisioningService.deprovision({
      email: 'proeba1@cloudfly.com.co',
      domain: 'easysnotes.com',
    });

    expect(result.success).toBe(true);
    expect(result.purgedHestiaUsers).toContain('u_45232lpw39');
    expect(result.purgedDomains).toContain('easysnotes.com');

    // Verify Hestia user purge
    expect(mockHostingService.purgeHestiaUser).toHaveBeenCalledWith('u_45232lpw39');

    // Verify domain purge
    expect(mockHostingService.purgeDomain).toHaveBeenCalledWith('easysnotes.com', 'u_45232lpw39');

    // Verify cloudfly test mailbox delete
    expect(mockHostingService.deleteMailAccount).toHaveBeenCalledWith('cloudfly', 'cloudfly.com.co', 'proeba1');

    // Verify DB deletions
    expect(mockUow.organizations.delete).toHaveBeenCalledWith('org-123');
    expect(mockUow.users.delete).toHaveBeenCalledWith('usr-123');
  });

  it('handles safety checks preventing deletion of system users (admin, manager, root)', async () => {
    const membership = {
      id: 'mem-sys',
      userId: 'usr-sys',
      organizationId: 'org-sys',
      role: 'OWNER',
      linkedHestiaUser: 'admin',
      createdAt: new Date(),
    };
    mockUow.users.findByEmail.mockResolvedValue({ id: 'usr-sys', email: 'admin@system.com' });
    mockUow.memberships.listByOrganization.mockResolvedValue([membership]);

    const result = await deprovisioningService.deprovision({
      email: 'admin@system.com',
    });

    expect(result.purgedHestiaUsers).not.toContain('admin');
    expect(mockHostingService.purgeHestiaUser).not.toHaveBeenCalled();
  });

  it('runs idempotently when user or resources do not exist', async () => {
    mockUow.users.findByEmail.mockResolvedValue(null);

    const result = await deprovisioningService.deprovision({
      email: 'nonexistent@test.com',
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('completed');
  });
});

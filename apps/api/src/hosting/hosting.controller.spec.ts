import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HostingController } from './hosting.controller';
import { HostingManagementService } from '@cloudfly/domain';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('HostingController (Hosting API & Tenant Guards)', () => {
  let controller: HostingController;
  let hostingService: HostingManagementService;
  let mockTransport: any;

  const userContext = {
    user: {
      userId: 'usr-101',
      organizationId: 'org-tenant-101',
      roles: ['OWNER'],
      permissions: [],
      isOperator: false,
    },
  };

  beforeEach(() => {
    mockTransport = {
      executeCommand: vi.fn().mockResolvedValue({ returnCode: 0, output: 'OK' }),
    };
    hostingService = new HostingManagementService(mockTransport);
    controller = new HostingController(hostingService);
  });

  describe('Websites Management', () => {
    it('creates a new website using authenticated user context', async () => {
      const result = await controller.createSite(
        {
          domain: 'myshop.com',
          type: 'WordPress Pro',
          phpVersion: '8.3',
        },
        userContext as any
      );

      expect(result.domain).toBe('myshop.com');
      expect(result.organizationId).toBe('org-tenant-101');
      expect(result.phpVersion).toBe('8.3');
    });

    it('lists only websites belonging to caller organization', async () => {
      await controller.createSite({ domain: 'myshop.com' }, userContext as any);

      const sites = await controller.listSites(userContext as any);
      expect(sites.length).toBe(1);
      expect(sites[0].domain).toBe('myshop.com');
    });

    it('rejects invalid PHP version with 400 Bad Request', async () => {
      await expect(
        controller.createSite({ domain: 'badphp.com', phpVersion: '5.1' }, userContext as any)
      ).rejects.toThrow(BadRequestException);
    });

    it('updates PHP version successfully for site owner', async () => {
      await controller.createSite({ domain: 'shop2.com', phpVersion: '8.1' }, userContext as any);

      const res = await controller.updatePhp(
        'shop2.com',
        { phpVersion: '8.3' },
        userContext as any
      );
      expect(res.status).toBe('SUCCESS');
    });
  });

  describe('Databases Management', () => {
    it('creates database and returns white-label details', async () => {
      const db = await controller.createDatabase(
        {
          databaseName: 'store_db',
          dbUser: 'store_admin',
          password: 'Password2026!',
        },
        userContext as any
      );

      expect(db.databaseName).toContain('store_db');
      expect(db.organizationId).toBe('org-tenant-101');

      const list = await controller.listDatabases(userContext as any);
      expect(list.length).toBe(1);
    });
  });

  describe('Email Accounts & Quotas', () => {
    it('creates email account for owned domain', async () => {
      await controller.createSite({ domain: 'mybrand.com' }, userContext as any);

      const res = await controller.createEmail(
        {
          domain: 'mybrand.com',
          account: 'info',
          password: 'SecretEmailPass!',
        },
        userContext as any
      );
      expect(res.status).toBe('SUCCESS');

      const emails = await controller.listEmails('mybrand.com', userContext as any);
      expect(emails.length).toBe(1);
      expect(emails[0].email).toBe('info@mybrand.com');
    });

    it('returns calculated hosting quotas', async () => {
      await controller.createSite({ domain: 'quota.com' }, userContext as any);

      const quotas = await controller.getQuotas(userContext as any);
      expect(quotas.sitesCount).toBe(1);
      expect(quotas.maxSites).toBe(10);
      expect(quotas.diskLimitMb).toBe(10240);
    });
  });
});

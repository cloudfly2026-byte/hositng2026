import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  HostingManagementService,
  CreateWebSiteSpec,
  InvalidPhpVersionError,
  WebSiteNotFoundError,
  DomainAlreadyExistsError,
} from './hosting-management';
import { AuthorizedContext } from '@cloudfly/contracts';
import { CrossTenantViolationError } from '../identity/rbac';

describe('HostingManagementService (White-Label Hosting Management)', () => {
  let service: HostingManagementService;
  let mockHestiaTransport: any;

  const tenantAContext: AuthorizedContext = {
    userId: 'usr-tenant-a',
    organizationId: 'org-tenant-a',
    roles: ['OWNER'],
    permissions: [],
  };

  const tenantBContext: AuthorizedContext = {
    userId: 'usr-tenant-b',
    organizationId: 'org-tenant-b',
    roles: ['OWNER'],
    permissions: [],
  };

  beforeEach(() => {
    mockHestiaTransport = {
      executeCommand: vi.fn().mockImplementation(async (command: string, args: string[]) => {
        if (command === 'v-list-web-domain') {
          return {
            returnCode: 0,
            output: JSON.stringify({
              [args[1]]: {
                IP: '89.117.147.134',
                SSL: 'yes',
                BACKEND: 'php-8.3',
                U_DISK: '420',
              },
            }),
          };
        }
        if (command === 'v-search-domain-owner') {
          if (args[0] === 'registered.com' || args[0] === 'duplicate.com') {
            return { returnCode: 0, output: 'admin' };
          }
          return { returnCode: 3, output: 'Error: not found' };
        }
        return { returnCode: 0, output: 'Success' };
      }),
    };

    service = new HostingManagementService(mockHestiaTransport);
  });

  describe('Website Provisioning & Management', () => {
    it('creates a new website for organization with default PHP 8.3 and SSL', async () => {
      const spec: CreateWebSiteSpec = {
        domain: 'acme-corp.com',
        type: 'WordPress Pro',
        phpVersion: '8.3',
      };

      const result = await service.createWebSite(spec, tenantAContext);

      expect(result.domain).toBe('acme-corp.com');
      expect(result.organizationId).toBe('org-tenant-a');
      expect(result.phpVersion).toBe('8.3');
      expect(result.sslStatus).toBe('ACTIVE');
      expect(result.status).toBe('HEALTHY');

      // Verify idempotent underlying calls without provider branding leaked
      expect(mockHestiaTransport.executeCommand).toHaveBeenCalledWith(
        'v-add-web-domain',
        expect.arrayContaining(['acme-corp.com'])
      );
      expect(mockHestiaTransport.executeCommand).toHaveBeenCalledWith(
        'v-add-letsencrypt-domain',
        expect.arrayContaining(['acme-corp.com'])
      );
    });

    it('rejects unsupported or dangerous PHP version strings', async () => {
      const spec: CreateWebSiteSpec = {
        domain: 'legacy.com',
        type: 'Custom PHP',
        phpVersion: '5.2; rm -rf /',
      };

      await expect(service.createWebSite(spec, tenantAContext)).rejects.toThrow(
        InvalidPhpVersionError
      );
    });

    it('rejects domain creation if the domain already exists on the platform', async () => {
      await service.createWebSite({ domain: 'duplicate.com' }, tenantAContext);

      await expect(
        service.createWebSite({ domain: 'duplicate.com' }, tenantBContext)
      ).rejects.toThrow(DomainAlreadyExistsError);
    });

    it('checks domain availability correctly', async () => {
      await service.createWebSite({ domain: 'registered.com' }, tenantAContext);

      const taken = await service.checkDomainAvailability('registered.com');
      expect(taken.available).toBe(false);

      const available = await service.checkDomainAvailability('completely-new-domain.com');
      expect(available.available).toBe(true);
    });

    it('lists only websites belonging to caller organization (Strict Tenant Isolation)', async () => {
      await service.createWebSite({ domain: 'site-a.com' }, tenantAContext);
      await service.createWebSite({ domain: 'site-b.com' }, tenantBContext);

      const sitesTenantA = await service.listWebSites('org-tenant-a');
      expect(sitesTenantA.length).toBe(1);
      expect(sitesTenantA[0].domain).toBe('site-a.com');

      const sitesTenantB = await service.listWebSites('org-tenant-b');
      expect(sitesTenantB.length).toBe(1);
      expect(sitesTenantB[0].domain).toBe('site-b.com');
    });

    it('prevents tenant B from modifying website of tenant A', async () => {
      await service.createWebSite({ domain: 'target.com' }, tenantAContext);

      await expect(
        service.updatePhpVersion('target.com', '8.2', tenantBContext)
      ).rejects.toThrow(CrossTenantViolationError);
    });

    it('updates PHP version successfully for site owner', async () => {
      await service.createWebSite({ domain: 'valid-php.com', phpVersion: '8.1' }, tenantAContext);

      const receipt = await service.updatePhpVersion('valid-php.com', '8.3', tenantAContext);
      expect(receipt.status).toBe('SUCCESS');

      const site = await service.getWebSiteDetail('valid-php.com', tenantAContext);
      expect(site.phpVersion).toBe('8.3');
    });

    it('imports an existing website idempotently and prevents cross-tenant takeover', async () => {
      const imported = await service.importExistingWebSite(
        { domain: 'cloudfly.com.co', phpVersion: '8.3' },
        tenantAContext
      );
      expect(imported.domain).toBe('cloudfly.com.co');
      expect(imported.organizationId).toBe('org-tenant-a');
      expect(imported.sslStatus).toBe('ACTIVE');

      // Re-importing returns same record
      const reimported = await service.importExistingWebSite(
        { domain: 'cloudfly.com.co' },
        tenantAContext
      );
      expect(reimported.domain).toBe('cloudfly.com.co');

      // Tenant B cannot import or take over Tenant A's domain
      await expect(
        service.importExistingWebSite({ domain: 'cloudfly.com.co' }, tenantBContext)
      ).rejects.toThrow(CrossTenantViolationError);
    });

    it('synchronizes real websites from Hestia transport when listing for organization with linked user', async () => {
      mockHestiaTransport.executeCommand.mockImplementation(async (command: string, args: string[]) => {
        if (command === 'v-list-web-domains' && args[0] === 'velupi') {
          return {
            returnCode: 0,
            output: JSON.stringify({
              'velupi.com': {
                IP: '89.117.147.134',
                SSL: 'yes',
                BACKEND: 'php-8.3',
                U_DISK: '250',
                SUSPENDED: 'no',
              },
            }),
          };
        }
        return { returnCode: 0, output: 'Success' };
      });

      const sites = await service.listWebSites('org-velupi', 'velupi');
      expect(sites.length).toBe(1);
      expect(sites[0].domain).toBe('velupi.com');
      expect(sites[0].organizationId).toBe('org-velupi');
      expect(sites[0].sslStatus).toBe('ACTIVE');
      expect(sites[0].status).toBe('HEALTHY');
      expect(mockHestiaTransport.executeCommand).toHaveBeenCalledWith(
        'v-list-web-domains',
        ['velupi', 'json']
      );
    });
  });

  describe('Databases Management', () => {
    it('creates and lists databases scoped to organization', async () => {
      const db = await service.createDatabase(
        {
          databaseName: 'app_production',
          dbUser: 'app_user',
          password: 'DbPassword2026!',
          type: 'MYSQL',
        },
        tenantAContext
      );

      expect(db.databaseName).toContain('app_production');
      expect(db.type).toBe('MYSQL');
      expect(db.organizationId).toBe('org-tenant-a');

      const list = await service.listDatabases('org-tenant-a');
      expect(list.length).toBe(1);
      expect(list[0].databaseName).toContain('app_production');

      // Tenant B sees no databases
      const listB = await service.listDatabases('org-tenant-b');
      expect(listB.length).toBe(0);
    });
  });

  describe('Email Accounts Management', () => {
    it('creates email account for web domain owned by tenant', async () => {
      await service.createWebSite({ domain: 'emaildomain.com' }, tenantAContext);

      const emailReceipt = await service.createEmailAccount(
        {
          domain: 'emaildomain.com',
          account: 'contact',
          password: 'EmailSecret2026!',
          quotaMb: 1024,
        },
        tenantAContext
      );

      expect(emailReceipt.status).toBe('SUCCESS');

      const emails = await service.listEmailAccounts('emaildomain.com', tenantAContext);
      expect(emails.length).toBe(1);
      expect(emails[0].email).toBe('contact@emaildomain.com');
    });

    it('rejects email account creation for domain of another tenant', async () => {
      await service.createWebSite({ domain: 'tenant-a-mail.com' }, tenantAContext);

      await expect(
        service.createEmailAccount(
          {
            domain: 'tenant-a-mail.com',
            account: 'hacker',
            password: 'BadPassword!',
            quotaMb: 500,
          },
          tenantBContext
        )
      ).rejects.toThrow(CrossTenantViolationError);
    });
  });

  describe('Hosting Quotas', () => {
    it('returns calculated disk, domain, database, and email quota usages', async () => {
      await service.createWebSite({ domain: 'quota-test.com' }, tenantAContext);
      await service.createDatabase(
        { databaseName: 'db1', dbUser: 'u1', password: 'P1!', type: 'MYSQL' },
        tenantAContext
      );

      const quotas = await service.getHostingQuotas('org-tenant-a');
      expect(quotas.sitesCount).toBe(1);
      expect(quotas.databasesCount).toBe(1);
      expect(quotas.diskUsedMb).toBeGreaterThanOrEqual(0);
      expect(quotas.diskLimitMb).toBe(10240); // 10 GB default
    });
  });

  describe('White-Label Sanitization', () => {
    it('ensures no provider brands or server paths leak in site detail or logs', async () => {
      await service.createWebSite({ domain: 'clean-brand.com' }, tenantAContext);
      const site = await service.getWebSiteDetail('clean-brand.com', tenantAContext);

      const serialized = JSON.stringify(site).toLowerCase();
      expect(serialized).not.toContain('hestia');
      expect(serialized).not.toContain('8083');
      expect(serialized).not.toContain('/usr/local/hestia');
    });
  });
});

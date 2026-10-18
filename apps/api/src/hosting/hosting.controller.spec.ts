import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HostingController } from './hosting.controller';
import { HostingManagementService, FileManagerService } from '@cloudfly/domain';
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

    it('enables SSL successfully for site owner', async () => {
      await controller.createSite({ domain: 'ssl-shop.com' }, userContext as any);

      const res = await controller.enableSsl('ssl-shop.com', userContext as any);
      expect(res.status).toBe('SUCCESS');
      expect(res.message).toContain('SSL');
    });

    it('imports an existing site using authenticated user context', async () => {
      const imported = await controller.importSite(
        { domain: 'cloudfly.com.co', phpVersion: '8.2' },
        userContext as any
      );
      expect(imported.domain).toBe('cloudfly.com.co');
      expect(imported.organizationId).toBe('org-tenant-101');
    });

    it('lists real websites returned from Hestia transport when linkedHestiaUser is set', async () => {
      mockTransport.executeCommand = vi.fn().mockResolvedValue({
        returnCode: 0,
        output: JSON.stringify({
          'velupi.com': {
            IP: '89.117.147.134',
            SSL: 'yes',
            LETSENCRYPT: 'yes',
            BACKEND: 'default',
            U_DISK: '150',
            SUSPENDED: 'no',
          },
        }),
      });

      const pilotCtx = {
        user: {
          userId: 'usr-pilot-1',
          organizationId: 'org-velupi-internal',
          linkedHestiaUser: 'velupi',
        },
      };

      const sites = await controller.listSites(pilotCtx as any);
      expect(sites).toHaveLength(1);
      expect(sites[0].domain).toBe('velupi.com');
      expect(sites[0].sslStatus).toBe('ACTIVE');
      expect(sites[0].ip).toBe('89.117.147.134');
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

  describe('File Manager, Custom SSL & SSO Integrations', () => {
    it('creates directories and uploads files respecting tenant isolation', async () => {
      const fileService = new FileManagerService();
      const ctrl = new HostingController(hostingService, fileService);

      const folder = await ctrl.createDirectory(
        { path: 'public_html/assets' },
        userContext as any
      );
      expect(folder.name).toBe('assets');

      const uploaded = await ctrl.uploadFile(
        {
          path: 'public_html/index.html',
          contentBase64: Buffer.from('<h1>Hello Velupi</h1>').toString('base64'),
          mimeType: 'text/html',
        },
        userContext as any
      );
      expect(uploaded.name).toBe('index.html');
      expect(uploaded.sizeBytes).toBeGreaterThan(0);

      const files = await ctrl.listFiles({ ...userContext, query: { path: 'public_html' } } as any);
      expect(files.some((f: any) => f.name === 'index.html')).toBe(true);
    });

    it('installs custom SSL without returning or exposing private key', async () => {
      const res = await controller.installCustomSsl(
        {
          domain: 'velupi.com',
          sslCertificate: '-----BEGIN CERTIFICATE-----\nMIIC...\n-----END CERTIFICATE-----',
          sslKey: '-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----',
        },
        userContext as any
      );

      expect(res.status).toBe('SUCCESS');
      expect(res.resourceIdentifier).toBe('velupi.com');
      expect((res as any).sslKey).toBeUndefined();
    });

    it('generates secure authenticated SSO token for phpMyAdmin', async () => {
      const sso = await controller.getPhpMyAdminSso(userContext as any);
      expect(sso.ssoUrl).toContain('https://pma.velupi.com/?user=');
      expect(sso.ssoUrl).toContain('&session=');
      expect(sso.expiresIn).toBe(300);
    });

    it('generates secure authenticated SSO autologin for Webmail', async () => {
      const sso = await controller.getWebmailSso(userContext as any);
      expect(sso.ssoUrl).toContain('https://mail.velupi.com/?_autologin=');
      expect(sso.expiresIn).toBe(300);
    });
  });
});


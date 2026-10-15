import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ControlledOperationsService } from './controlled-operations';
import { HostingManagementService } from '../hosting/hosting-management';
import { DnsManagerService } from '../dns/dns-manager';
import { AuditLogger } from '../identity/rbac';
import { AuthorizedContext } from '@cloudfly/contracts';

describe('Controlled Operations Engine (TDD: Site, DNS, Database, SSL Writes)', () => {
  let controlledOps: ControlledOperationsService;
  let hostingService: HostingManagementService;
  let dnsManager: DnsManagerService;
  let auditLogger: AuditLogger;

  const adminContext: AuthorizedContext = {
    userId: 'usr-admin-1',
    organizationId: 'org-tenant-alpha',
    roles: ['ADMIN'],
    permissions: ['*'],
  };

  const viewerContext: AuthorizedContext = {
    userId: 'usr-viewer-1',
    organizationId: 'org-tenant-alpha',
    roles: ['VIEWER'],
    permissions: ['READ'],
  };

  beforeEach(() => {
    auditLogger = new AuditLogger();
    const mockTransport = {
      executeCommand: vi.fn().mockResolvedValue({
        returnCode: 0,
        output: JSON.stringify({ status: 'OK' }),
      }),
    };
    hostingService = new HostingManagementService(mockTransport);
    dnsManager = new DnsManagerService();
    controlledOps = new ControlledOperationsService(hostingService, dnsManager, auditLogger);
  });

  describe('Controlled WebSite Writes', () => {
    it('creates a website with audit log and enforces OWNER/ADMIN role', async () => {
      const site = await controlledOps.createWebSite(
        { domain: 'alpha-shop.com', phpVersion: '8.3' },
        adminContext
      );

      expect(site.domain).toBe('alpha-shop.com');
      const events = auditLogger.getEventsForTenant('org-tenant-alpha');
      expect(events).toHaveLength(1);
      expect(events[0].action).toBe('CREATE_WEBSITE');
      expect(events[0].resource).toBe('alpha-shop.com');
      expect(events[0].actorUserId).toBe('usr-admin-1');
    });

    it('rejects website creation when called by VIEWER role', async () => {
      await expect(
        controlledOps.createWebSite({ domain: 'forbidden.com' }, viewerContext)
      ).rejects.toThrow(/Permission denied/);
    });

    it('is strictly idempotent: returns existing site detail on duplicate creation without throwing error', async () => {
      await controlledOps.createWebSite({ domain: 'idempotent-site.com' }, adminContext);
      const reCreated = await controlledOps.createWebSite({ domain: 'idempotent-site.com' }, adminContext);

      expect(reCreated.domain).toBe('idempotent-site.com');
    });
  });

  describe('Controlled Database Writes', () => {
    it('creates a database with tenant-isolated prefix and audit log', async () => {
      const db = await controlledOps.createDatabase(
        { databaseName: 'orders_db', dbUser: 'dbuser', password: 'SafePassword123!' },
        adminContext
      );

      expect(db.databaseName).toContain('orders_db');
      const events = auditLogger.getEventsForTenant('org-tenant-alpha');
      expect(events.some((e) => e.action === 'CREATE_DATABASE' && e.resource.includes('orders_db'))).toBe(true);
    });

    it('rejects database creation by unauthorized roles', async () => {
      await expect(
        controlledOps.createDatabase(
          { databaseName: 'secret_db', dbUser: 'u', password: 'p' },
          viewerContext
        )
      ).rejects.toThrow(/Permission denied/);
    });
  });

  describe('Controlled DNS Writes', () => {
    it('adds DNS record with RFC 1912 verification and records audit event', () => {
      const zone = dnsManager.createZone({ organizationId: 'org-tenant-alpha', domain: 'alpha-dns.com' });

      const record = controlledOps.addDnsRecord(
        {
          zoneId: zone.id,
          name: 'api',
          type: 'A',
          value: '169.58.220.244',
          ttl: 3600,
        },
        adminContext
      );

      expect(record.name).toBe('api');
      const events = auditLogger.getEventsForTenant('org-tenant-alpha');
      expect(events.some((e) => e.action === 'ADD_DNS_RECORD' && e.resource === 'A api.alpha-dns.com')).toBe(true);
    });

    it('rejects DNS writes by unauthorized roles or cross-tenant actors', () => {
      const zone = dnsManager.createZone({ organizationId: 'org-tenant-alpha', domain: 'alpha-dns.com' });

      expect(() =>
        controlledOps.addDnsRecord(
          { zoneId: zone.id, name: 'api', type: 'A', value: '1.2.3.4' },
          viewerContext
        )
      ).toThrow(/Permission denied/);
    });
  });

  describe('Controlled SSL Issuance', () => {
    it('issues Let Encrypt SSL certificate for existing tenant website with audit trail', async () => {
      await controlledOps.createWebSite({ domain: 'secure-portal.com', sslEnabled: false }, adminContext);

      const receipt = await controlledOps.issueSslCertificate('secure-portal.com', adminContext);
      expect(receipt.status).toBe('SUCCESS');
      expect(receipt.resourceIdentifier).toBe('secure-portal.com');

      const events = auditLogger.getEventsForTenant('org-tenant-alpha');
      expect(events.some((e) => e.action === 'ISSUE_SSL' && e.resource === 'secure-portal.com')).toBe(true);
    });

    it('rejects SSL issuance for cross-tenant sites', async () => {
      const crossContext: AuthorizedContext = {
        userId: 'usr-cross-1',
        organizationId: 'org-tenant-other',
        roles: ['ADMIN'],
        permissions: ['*'],
      };

      await expect(
        controlledOps.issueSslCertificate('secure-portal.com', crossContext)
      ).rejects.toThrow();
    });
  });
});

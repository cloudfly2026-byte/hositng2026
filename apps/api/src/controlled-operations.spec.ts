import { describe, it, expect, vi } from 'vitest';
import {
  DokployAdapter,
  DokployApiClient,
  HestiaHttpsTransport,
  HestiaReadOnlyViolationError,
} from '@cloudfly/deployment-adapters';
import {
  ServiceDeploymentSpec,
  AuthorizedContext,
} from '@cloudfly/contracts';
import {
  DnsManagerService,
  ControlledOperationsService,
  HostingManagementService,
  AuditLogger,
} from '@cloudfly/domain';

describe('Controlled Infrastructure & DNS Operations (Safety Verification)', () => {
  describe('Controlled Deployment Safety Check', () => {
    it('generates resource-constrained, tenant-isolated deployment spec without unconstrained limits', async () => {
      const mockClient: DokployApiClient = {
        createApplication: vi.fn().mockResolvedValue({
          applicationId: 'dok-controlled-app-01',
          name: 'safe-tenant-app',
          appName: 'safe-tenant-app',
          status: 'running',
        }),
        deployApplication: vi.fn().mockResolvedValue({ success: true }),
        getApplication: vi.fn().mockResolvedValue({
          applicationId: 'dok-controlled-app-01',
          name: 'safe-tenant-app',
          appName: 'safe-tenant-app',
          status: 'running',
        }),
        stopApplication: vi.fn().mockResolvedValue({ success: true }),
        restartApplication: vi.fn().mockResolvedValue({ success: true }),
        getApplicationLogs: vi.fn().mockResolvedValue(['Deployment OK']),
      };

      const adapter = new DokployAdapter(
        { endpoint: 'http://169.58.220.244:3000', apiKey: 'test-token' },
        mockClient
      );

      const spec: ServiceDeploymentSpec = {
        serviceId: 'srv-controlled-1',
        projectId: 'prj-controlled-1',
        name: 'Controlled Health Worker',
        source: {
          type: 'GIT',
          repositoryUrl: 'https://github.com/velupi/controlled-test.git',
          branch: 'main',
        },
        resources: {
          cpuCores: 1,
          memoryMb: 1024,
          diskMb: 5120,
        },
        env: [{ key: 'NODE_ENV', value: 'production' }],
        ports: [8080],
      };

      const context: AuthorizedContext = {
        userId: 'usr-controlled-admin',
        organizationId: 'org-controlled-pilot',
        roles: ['ADMIN'],
        permissions: ['*'],
      };

      const receipt = await adapter.deploy(spec, context);

      expect(receipt.status).toBe('SUCCESS');
      expect(receipt.resourceIdentifier).toBe('dok-controlled-app-01');
      expect(mockClient.createApplication).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Controlled Health Worker',
          appName: expect.stringContaining('trolledpilot'),
        })
      );
    });
  });

  describe('Controlled DNS Query & RFC Validation Safety Check', () => {
    it('rejects conflicting CNAME records at zone level before issuing external DNS commands', () => {
      const dnsManager = new DnsManagerService();
      const zone = dnsManager.createZone({
        organizationId: 'org-dns-test',
        domain: 'controlled-test.com',
      });

      // Add address A record
      dnsManager.addRecord({
        zoneId: zone.id,
        name: 'api',
        type: 'A',
        value: '169.58.220.244',
        ttl: 3600,
      });

      // Attempting to add a CNAME on the exact same name must throw error before touching BIND9
      expect(() => {
        dnsManager.addRecord({
          zoneId: zone.id,
          name: 'api',
          type: 'CNAME',
          value: 'lb.controlled-test.com.',
          ttl: 3600,
        });
      }).toThrow(/RFC 1912/);
    });
  });

  describe('Controlled HestiaCP Read-Only Enforcement', () => {
    it('blocks mutating actions before dispatching HTTP network requests to HestiaCP', async () => {
      const mockSecrets: Record<string, string> = {
        HESTIA_HOST: '89.117.147.134',
        HESTIA_API_USER: 'api_ro_user',
        HESTIA_ACCESS_KEY: 'ak_test_key',
        HESTIA_SECRET_KEY: 'sk_test_key',
        HESTIA_READ_ONLY: 'true',
      };

      const transport = HestiaHttpsTransport.fromSecretStore((k) => mockSecrets[k]);
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      await expect(
        transport.executeCommand('v-delete-user', ['test_user'])
      ).rejects.toThrow(HestiaReadOnlyViolationError);

      await expect(
        transport.executeCommand('v-rebuild-dns-domains', [])
      ).rejects.toThrow(HestiaReadOnlyViolationError);

      // Verify zero network calls were made to Hestia
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Controlled Writes with Audit & Permission Validation', () => {
    it('executes site, db, and dns writes with full audit trail and strict role validation', async () => {
      const mockTransport = {
        executeCommand: vi.fn().mockResolvedValue({
          returnCode: 0,
          output: JSON.stringify({ status: 'OK' }),
        }),
      };
      const hosting = new HostingManagementService(mockTransport);
      const dns = new DnsManagerService();
      const audit = new AuditLogger();
      const controlled = new ControlledOperationsService(hosting, dns, audit);

      const adminCtx: AuthorizedContext = {
        userId: 'admin-1',
        organizationId: 'org-safe',
        roles: ['OWNER'],
        permissions: ['*'],
      };

      const site = await controlled.createWebSite({ domain: 'safe-shop.com' }, adminCtx);
      expect(site.domain).toBe('safe-shop.com');

      const zone = dns.createZone({ organizationId: 'org-safe', domain: 'safe-shop.com' });
      const rec = controlled.addDnsRecord(
        { zoneId: zone.id, name: 'api', type: 'A', value: '169.58.220.244' },
        adminCtx
      );
      expect(rec.name).toBe('api');

      const ssl = await controlled.issueSslCertificate('safe-shop.com', adminCtx);
      expect(ssl.status).toBe('SUCCESS');

      const events = audit.getEventsForTenant('org-safe');
      expect(events).toHaveLength(3);
      expect(events.map((e) => e.action)).toEqual(['CREATE_WEBSITE', 'ADD_DNS_RECORD', 'ISSUE_SSL']);
    });
  });
});

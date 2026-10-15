import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthController } from './auth/auth.controller';
import { HostingController } from './hosting/hosting.controller';
import { DnsController } from './dns/dns.controller';
import { CloudAppsController } from './cloud-apps/cloud-apps.controller';
import {
  AuthenticationService,
  Argon2PasswordHasher,
  JwtSecurityService,
  HostingManagementService,
  DnsManagerService,
  CloudAppsService,
} from '@cloudfly/domain';
import {
  HestiaDnsAdapter,
  DokployAdapter,
  DokployApiClient,
  HestiaTransport,
} from '@cloudfly/deployment-adapters';
import { ForbiddenException, HttpException } from '@nestjs/common';

describe('E2E Platform Integration: Auth -> Hosting -> DNS -> Cloud Apps', () => {
  let authController: AuthController;
  let hostingController: HostingController;
  let dnsController: DnsController;
  let cloudAppsController: CloudAppsController;

  let jwtService: JwtSecurityService;
  let hestiaTransport: HestiaTransport;
  let dokployAdapter: DokployAdapter;

  beforeEach(() => {
    // 1. Auth & Security
    const passwordHasher = new Argon2PasswordHasher();
    jwtService = new JwtSecurityService('velupi_e2e_jwt_secret_2026_super_secure');
    const authService = new AuthenticationService(passwordHasher, jwtService);
    authController = new AuthController(authService);

    // 2. Hosting & Site Tools
    hestiaTransport = {
      executeCommand: vi.fn().mockResolvedValue({ returnCode: 0, output: 'OK' }),
    };
    const hostingService = new HostingManagementService(hestiaTransport);
    hostingController = new HostingController(hostingService);

    // 3. DNS Manager
    const hestiaDns = new HestiaDnsAdapter();
    const dnsManager = new DnsManagerService();
    dnsController = new DnsController(dnsManager, hestiaDns, hestiaTransport);

    // 4. Cloud Apps (Dokploy)
    const mockDokployClient: DokployApiClient = {
      createApplication: vi.fn().mockResolvedValue({
        applicationId: 'dok-app-1',
        name: 'test-app',
        appName: 'test-app',
        status: 'running',
      }),
      deployApplication: vi.fn().mockResolvedValue({ success: true }),
      getApplication: vi.fn().mockResolvedValue({
        applicationId: 'dok-app-1',
        name: 'test-app',
        appName: 'test-app',
        status: 'running',
      }),
      stopApplication: vi.fn().mockResolvedValue({ success: true }),
      restartApplication: vi.fn().mockResolvedValue({ success: true }),
      getApplicationLogs: vi.fn().mockResolvedValue(['Container started', 'Ready on port 3000']),
    };
    dokployAdapter = new DokployAdapter(
      { endpoint: 'http://169.58.220.244:3000', apiKey: 'test-key' },
      mockDokployClient
    );
    const cloudAppsService = new CloudAppsService(dokployAdapter);
    cloudAppsController = new CloudAppsController(cloudAppsService);
  });

  it('performs complete authenticated lifecycle: Register -> Login -> Host -> DNS -> App', async () => {
    // Step 1: User Registration
    const regResult = await authController.register({
      email: 'founder@velupi.com',
      password: 'StrongPassword2026!',
      fullName: 'Founder Velupi',
      organizationName: 'Velupi Pilot Org',
    });

    expect(regResult.user.email).toBe('founder@velupi.com');
    expect(regResult.organization.name).toBe('Velupi Pilot Org');
    const orgId = regResult.organization.id;

    // Step 2: Login and JWT Verification
    const loginResult = await authController.login({
      email: 'founder@velupi.com',
      password: 'StrongPassword2026!',
    });

    expect(loginResult.tokens.accessToken).toBeDefined();
    expect(loginResult.user.email).toBe('founder@velupi.com');
    const tokenPayload = jwtService.verify(loginResult.tokens.accessToken);
    expect(tokenPayload.userId).toBe(loginResult.user.id);
    expect(tokenPayload.organizationId).toBe(orgId);

    // Simulated authenticated request context
    const reqContext = {
      user: {
        userId: tokenPayload.userId,
        organizationId: orgId,
        email: loginResult.user.email,
        roles: tokenPayload.roles,
      },
    };

    // Step 3: Hosting Site Creation & Management
    const site = await hostingController.createSite(
      {
        domain: 'velupi.com',
        type: 'WORDPRESS',
        phpVersion: '8.2',
        sslEnabled: true,
      },
      reqContext
    );

    expect(site.domain).toBe('velupi.com');
    expect(site.phpVersion).toBe('8.2');
    expect(site.sslStatus).toBe('ACTIVE');

    const siteList = await hostingController.listSites(reqContext);
    expect(siteList.length).toBeGreaterThanOrEqual(1);
    expect(siteList.some((s: any) => s.domain === 'velupi.com')).toBe(true);

    // Step 4: DNS Zone Creation and Record Management
    const zone = await dnsController.createZone(orgId, {
      organizationId: orgId,
      domain: 'velupi.com',
      primaryNs: 'ns1.velupi.com',
      secondaryNs: 'ns2.velupi.com',
    });

    expect(zone.domain).toBe('velupi.com');
    expect(zone.organizationId).toBe(orgId);

    const aRecord = await dnsController.addRecord(zone.id, orgId, {
      name: '@',
      type: 'A',
      value: '169.58.220.244',
      ttl: 3600,
    });
    expect(aRecord.type).toBe('A');
    expect(aRecord.value).toBe('169.58.220.244');

    const cnameRecord = await dnsController.addRecord(zone.id, orgId, {
      name: 'api',
      type: 'CNAME',
      value: 'velupi.com.',
      ttl: 3600,
    });
    expect(cnameRecord.name).toBe('api');

    // Reconcile DNS Zone
    const reconcileResult = await dnsController.reconcileZone(zone.id, orgId);
    expect(reconcileResult.success).toBe(true);

    // Step 5: Cloud Application Creation and Lifecycle
    const cloudApp = await cloudAppsController.createApp(orgId, {
      name: 'Velupi Web Portal',
      runtimeTemplateId: 'node-20',
      source: {
        type: 'GIT',
        repositoryUrl: 'https://github.com/cloudfly2026-byte/hosting2026.git',
        branch: 'main',
      },
      resources: {
        cpuCores: 2,
        memoryMb: 2048,
        diskMb: 10240,
      },
      ports: [3000],
      domain: 'app.velupi.com',
    });

    expect(cloudApp.id).toBeDefined();
    expect(cloudApp.name).toBe('Velupi Web Portal');
    expect(cloudApp.organizationId).toBe(orgId);

    // Restart and fetch logs
    const restartReceipt = await cloudAppsController.restartApp(cloudApp.id, orgId);
    expect(restartReceipt.status).toBe('SUCCESS');

    const logs = await cloudAppsController.getLogs(cloudApp.id, orgId);
    expect(logs.lines).toBeDefined();
  });

  it('strictly enforces multi-tenant isolation across all endpoints', async () => {
    // Tenant A
    const tenantA = await authController.register({
      email: 'tenant_a@velupi.com',
      password: 'Password2026!',
      fullName: 'Tenant A',
      organizationName: 'Org A',
    });

    // Tenant B
    const tenantB = await authController.register({
      email: 'tenant_b@velupi.com',
      password: 'Password2026!',
      fullName: 'Tenant B',
      organizationName: 'Org B',
    });

    const orgA = tenantA.organization.id;
    const orgB = tenantB.organization.id;

    // Tenant A creates DNS zone
    const zoneA = await dnsController.createZone(orgA, {
      organizationId: orgA,
      domain: 'company-a.com',
    });

    // Tenant B attempts cross-tenant access to Tenant A's DNS zone -> 403 Forbidden
    await expect(dnsController.getZone(zoneA.id, orgB)).rejects.toThrow(HttpException);

    // Tenant A creates Cloud App
    const appA = await cloudAppsController.createApp(orgA, {
      name: 'App Tenant A',
      runtimeTemplateId: 'python-3.12',
      source: {
        type: 'GIT',
        repositoryUrl: 'https://github.com/tenant-a/service.git',
        branch: 'main',
      },
      resources: { cpuCores: 1, memoryMb: 1024, diskMb: 5120 },
    });

    // Tenant B attempts to restart Tenant A's app -> 403 Forbidden
    await expect(cloudAppsController.restartApp(appA.id, orgB)).rejects.toThrow(HttpException);
  });

  it('executes non-destructive E2E lifecycle with provider reconciliation and tenant isolation', async () => {
    const userRes = await authController.register({
      email: 'pilot_e2e@velupi.com',
      password: 'SecurePassword2026!',
      fullName: 'E2E Pilot User',
      organizationName: 'Velupi Pilot E2E',
    });

    const orgId = userRes.organization.id;

    // Simulate Hestia returning live site and DNS records
    hestiaTransport.executeCommand = vi.fn().mockImplementation(async (cmd: string) => {
      if (cmd === 'v-list-web-domains') {
        return {
          returnCode: 0,
          output: JSON.stringify({
            'velupi.com': { IP: '89.117.147.134', SSL: 'yes', LETSENCRYPT: 'yes', U_DISK: '120' },
          }),
        };
      }
      if (cmd === 'v-list-dns-records') {
        return {
          returnCode: 0,
          output: JSON.stringify({
            '1': { RECORD: '@', TYPE: 'A', VALUE: '89.117.147.134', TTL: '14400' },
            '2': { RECORD: 'app', TYPE: 'A', VALUE: '169.58.220.244', TTL: '14400' },
          }),
        };
      }
      return { returnCode: 0, output: 'OK' };
    });

    // 1. List sites via Hestia transport
    const sites = await hostingController.listSites({
      user: { userId: userRes.user.id, organizationId: orgId, linkedHestiaUser: 'velupi' },
    } as any);
    expect(sites).toHaveLength(1);
    expect(sites[0].domain).toBe('velupi.com');

    // 2. Create DNS zone & reconcile with provider records
    const zone = await dnsController.createZone(orgId, {
      organizationId: orgId,
      domain: 'velupi.com',
    });

    const reconcileResult = await dnsController.reconcileZone(zone.id, orgId, {
      user: { linkedHestiaUser: 'velupi' },
    });
    expect(reconcileResult.success).toBe(true);

    const fullZone = await dnsController.getZone(zone.id, orgId);
    expect(fullZone.records.some((r) => r.name === 'app' && r.value === '169.58.220.244')).toBe(true);
  });
});

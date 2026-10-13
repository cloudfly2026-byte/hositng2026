import { describe, it, expect, vi } from 'vitest';
import {
  DokployAdapter,
  DokployApiClient,
  DokployAppResponse,
} from './dokploy-adapter';
import { AuthorizedContext, ServiceDeploymentSpec } from '@cloudfly/contracts';

describe('Epic C2 - Dokploy Deployment Adapter', () => {
  const context: AuthorizedContext = {
    userId: 'usr-10',
    organizationId: 'org-cloud-apps',
    roles: ['DEVELOPER'],
    permissions: ['deploy'],
  };

  const nodeJsSpec: ServiceDeploymentSpec = {
    serviceId: 'svc-node-app-01',
    name: 'Customer Next.js Frontend',
    domain: 'myfrontend.apps.velupi.com',
    runtime: 'nodejs-20',
    env: {
      NODE_ENV: 'production',
      PORT: '3000',
    },
  };

  it('reports capabilities accurately for Dokploy Docker-based engine', async () => {
    const mockClient: DokployApiClient = {
      createApplication: vi.fn(),
      deployApplication: vi.fn(),
      getApplication: vi.fn(),
      stopApplication: vi.fn(),
      restartApplication: vi.fn(),
      getApplicationLogs: vi.fn(),
    };

    const adapter = new DokployAdapter(
      {
        endpoint: 'http://169.58.220.244:3000/api',
        apiKey: 'dokploy_api_key_test',
      },
      mockClient
    );

    const caps = await adapter.capabilities();
    expect(caps.supportsCustomDomains).toBe(true);
    expect(caps.supportsSslLetEncrypt).toBe(true);
    expect(caps.supportsDatabases).toBe(true);
    expect(caps.supportsLiveLogs).toBe(true);
    expect(caps.supportsScale).toBe(true); // Dokploy supports container scaling/replicas
  });

  it('deploys a containerized application via Dokploy API with environment variables and domain', async () => {
    const mockAppResponse: DokployAppResponse = {
      applicationId: 'dok-app-888',
      name: 'Customer Next.js Frontend',
      appName: 'orgcloudapps-custome-01',
      status: 'done',
    };

    const mockClient: DokployApiClient = {
      createApplication: vi.fn().mockResolvedValue(mockAppResponse),
      deployApplication: vi.fn().mockResolvedValue({ success: true }),
      getApplication: vi.fn().mockResolvedValue(mockAppResponse),
      stopApplication: vi.fn().mockResolvedValue({ success: true }),
      restartApplication: vi.fn().mockResolvedValue({ success: true }),
      getApplicationLogs: vi.fn().mockResolvedValue(['Container started', 'Ready on port 3000']),
    };

    const adapter = new DokployAdapter(
      {
        endpoint: 'http://169.58.220.244:3000/api',
        apiKey: 'dokploy_api_key_test',
      },
      mockClient
    );

    const receipt = await adapter.deploy(nodeJsSpec, context);

    expect(receipt.status).toBe('SUCCESS');
    expect(receipt.resourceIdentifier).toBe('dok-app-888');
    expect(mockClient.createApplication).toHaveBeenCalledWith(
      expect.objectContaining({
        appName: expect.stringContaining('orgcloudapps'),
        domain: 'myfrontend.apps.velupi.com',
        env: expect.objectContaining({ NODE_ENV: 'production' }),
      })
    );
    expect(mockClient.deployApplication).toHaveBeenCalledWith('dok-app-888');
  });

  it('queries application observed state and reports HEALTHY when status is done/running', async () => {
    const mockClient: DokployApiClient = {
      createApplication: vi.fn(),
      deployApplication: vi.fn(),
      getApplication: vi.fn().mockResolvedValue({
        applicationId: 'dok-app-888',
        name: 'Customer Next.js Frontend',
        appName: 'orgcloudapps-custome-01',
        status: 'done',
      }),
      stopApplication: vi.fn(),
      restartApplication: vi.fn(),
      getApplicationLogs: vi.fn(),
    };

    const adapter = new DokployAdapter(
      {
        endpoint: 'http://169.58.220.244:3000/api',
        apiKey: 'dokploy_api_key_test',
      },
      mockClient
    );

    const observed = await adapter.status('dok-app-888', context);
    expect(observed.status).toBe('HEALTHY');
    expect(observed.activeDeploymentId).toBe('dok-app-888');
  });

  it('stops and restarts Dokploy application cleanly', async () => {
    const mockClient: DokployApiClient = {
      createApplication: vi.fn(),
      deployApplication: vi.fn(),
      getApplication: vi.fn(),
      stopApplication: vi.fn().mockResolvedValue({ success: true }),
      restartApplication: vi.fn().mockResolvedValue({ success: true }),
      getApplicationLogs: vi.fn(),
    };

    const adapter = new DokployAdapter(
      {
        endpoint: 'http://169.58.220.244:3000/api',
        apiKey: 'dokploy_api_key_test',
      },
      mockClient
    );

    const stopReceipt = await adapter.stop('dok-app-888', context);
    expect(stopReceipt.status).toBe('SUCCESS');
    expect(mockClient.stopApplication).toHaveBeenCalledWith('dok-app-888');

    const restartReceipt = await adapter.restart('dok-app-888', context);
    expect(restartReceipt.status).toBe('SUCCESS');
    expect(mockClient.restartApplication).toHaveBeenCalledWith('dok-app-888');
  });

  it('fetches application logs from Dokploy container', async () => {
    const mockClient: DokployApiClient = {
      createApplication: vi.fn(),
      deployApplication: vi.fn(),
      getApplication: vi.fn(),
      stopApplication: vi.fn(),
      restartApplication: vi.fn(),
      getApplicationLogs: vi.fn().mockResolvedValue([
        '[2026-10-13 18:00:00] Server listening on :3000',
        '[2026-10-13 18:00:01] GET /api/health 200 OK',
      ]),
    };

    const adapter = new DokployAdapter(
      {
        endpoint: 'http://169.58.220.244:3000/api',
        apiKey: 'dokploy_api_key_test',
      },
      mockClient
    );

    const logs = await adapter.logs('dok-app-888', context, { lines: 50 });
    expect(logs.lines).toHaveLength(2);
    expect(logs.lines[0]).toContain('Server listening on :3000');
  });
});

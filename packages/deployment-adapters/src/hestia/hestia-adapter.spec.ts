import { describe, it, expect, vi } from 'vitest';
import {
  HestiaAdapter,
  HestiaTransport,
  HestiaCommandResult,
} from './hestia-adapter';
import { AuthorizedContext, ServiceDeploymentSpec } from '@cloudfly/contracts';

describe('Epic C1 - HestiaCP Deployment Adapter', () => {
  const context: AuthorizedContext = {
    userId: 'usr-1',
    organizationId: 'org-velupi-internal',
    roles: ['OWNER'],
    permissions: ['deploy'],
  };

  const sampleSpec: ServiceDeploymentSpec = {
    serviceId: 'svc-wp-01',
    name: 'Velupi Commercial WordPress',
    domain: 'velupi.com',
    runtime: 'php-wordpress',
    database: {
      name: 'velupi_wp_db',
      type: 'MYSQL',
    },
  };

  it('reports capabilities accurately for HestiaCP engine', async () => {
    const mockTransport: HestiaTransport = {
      executeCommand: vi.fn(),
    };

    const adapter = new HestiaAdapter(
      {
        host: 'cloudfly.com.co',
        port: 8083,
        user: 'root',
      },
      mockTransport
    );

    const caps = await adapter.capabilities();
    expect(caps.supportsCustomDomains).toBe(true);
    expect(caps.supportsSslLetEncrypt).toBe(true);
    expect(caps.supportsDatabases).toBe(true);
    expect(caps.supportsLiveLogs).toBe(true);
    expect(caps.supportsScale).toBe(false); // Hestia does not do horizontal container scaling
  });

  it('deploys WordPress web domain, database and LetEncrypt SSL via Hestia commands', async () => {
    const executedCommands: string[] = [];

    const mockTransport: HestiaTransport = {
      executeCommand: vi.fn().mockImplementation(async (cmd: string, args: string[]): Promise<HestiaCommandResult> => {
        executedCommands.push(`${cmd} ${args.join(' ')}`);
        return { returnCode: 0, output: 'OK' };
      }),
    };

    const adapter = new HestiaAdapter(
      {
        host: 'cloudfly.com.co',
        port: 8083,
        user: 'root',
      },
      mockTransport
    );

    const receipt = await adapter.deploy(sampleSpec, context);

    expect(receipt.status).toBe('SUCCESS');
    expect(receipt.resourceIdentifier).toBe('velupi.com');

    // Verifies the sequence of Hestia CLI commands
    expect(executedCommands.some((c) => c.startsWith('v-add-user'))).toBe(true);
    expect(executedCommands.some((c) => c.includes('v-add-web-domain') && c.includes('velupi.com'))).toBe(true);
    expect(executedCommands.some((c) => c.includes('v-add-letsencrypt-domain') && c.includes('velupi.com'))).toBe(true);
    expect(executedCommands.some((c) => c.includes('v-add-database') && c.includes('velupi_wp_db'))).toBe(true);
  });

  it('is idempotent: reconciles gracefully if domain or user already exists on Hestia host', async () => {
    const mockTransport: HestiaTransport = {
      executeCommand: vi.fn().mockImplementation(async (cmd: string): Promise<HestiaCommandResult> => {
        if (cmd === 'v-add-user' || cmd === 'v-add-web-domain') {
          // Hestia returnCode 4 = Object already exists
          return { returnCode: 4, output: 'Error: Object already exists' };
        }
        return { returnCode: 0, output: 'OK' };
      }),
    };

    const adapter = new HestiaAdapter(
      {
        host: 'cloudfly.com.co',
        port: 8083,
        user: 'root',
      },
      mockTransport
    );

    const receipt = await adapter.deploy(sampleSpec, context);

    // Must still succeed via idempotent reconciliation
    expect(receipt.status).toBe('SUCCESS');
  });

  it('queries observed status of domain on Hestia host', async () => {
    const mockTransport: HestiaTransport = {
      executeCommand: vi.fn().mockResolvedValue({
        returnCode: 0,
        output: JSON.stringify({
          'velupi.com': {
            IP: '169.58.220.244',
            SSL: 'yes',
            STATUS: 'active',
          },
        }),
      }),
    };

    const adapter = new HestiaAdapter(
      {
        host: 'cloudfly.com.co',
        port: 8083,
        user: 'root',
      },
      mockTransport
    );

    const status = await adapter.status(sampleSpec.serviceId, context);
    expect(status.status).toBe('HEALTHY');
    expect(status.details?.ssl).toBe('yes');
  });
});

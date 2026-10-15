import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  HestiaHttpsTransport,
  HestiaReadOnlyViolationError,
  HESTIA_READ_ONLY_COMMANDS,
} from './hestia-https-transport';

describe('HestiaHttpsTransport (Secure HTTPS Read-Only Transport)', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = mockFetch;
  });

  it('allows read-only commands and sends encrypted HTTPS request to Hestia API port 8083', async () => {
    const transport = new HestiaHttpsTransport({
      host: '89.117.147.134',
      port: 8083,
      user: 'api_readonly_user',
      accessKey: 'ak_readonly_777',
      secretKey: 'sk_readonly_888',
      readOnly: true,
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '{"status": "OK", "domains": ["velupi.com"]}',
    });

    const result = await transport.executeCommand('v-list-web-domains', ['velupi_user', 'json']);

    expect(result.returnCode).toBe(0);
    expect(result.output).toContain('velupi.com');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://89.117.147.134:8083/api/',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('blocks mutating commands with HestiaReadOnlyViolationError when in readOnly mode', async () => {
    const transport = new HestiaHttpsTransport({
      host: '89.117.147.134',
      user: 'api_readonly_user',
      accessKey: 'ak_readonly',
      secretKey: 'sk_readonly',
      readOnly: true, // Default safe mode
    });

    // Mutating commands must be rejected
    await expect(
      transport.executeCommand('v-add-web-domain', ['velupi_user', 'malicious.com'])
    ).rejects.toThrow(HestiaReadOnlyViolationError);

    await expect(
      transport.executeCommand('v-delete-user', ['velupi_user'])
    ).rejects.toThrow(HestiaReadOnlyViolationError);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('whitelists all safe inspection and read-only commands', () => {
    expect(HESTIA_READ_ONLY_COMMANDS.has('v-list-web-domains')).toBe(true);
    expect(HESTIA_READ_ONLY_COMMANDS.has('v-list-databases')).toBe(true);
    expect(HESTIA_READ_ONLY_COMMANDS.has('v-list-dns-records')).toBe(true);
    expect(HESTIA_READ_ONLY_COMMANDS.has('v-list-mail-accounts')).toBe(true);
    expect(HESTIA_READ_ONLY_COMMANDS.has('v-list-sys-info')).toBe(true);
    expect(HESTIA_READ_ONLY_COMMANDS.has('v-add-web-domain')).toBe(false);
  });

  it('securely loads configuration from secret store and masks secrets in sanitized config', () => {
    const mockSecrets: Record<string, string> = {
      HESTIA_HOST: '89.117.147.134',
      HESTIA_API_USER: 'ro_operator',
      HESTIA_ACCESS_KEY: 'ak_restricted_123',
      HESTIA_SECRET_KEY: 'sk_ultra_secret_456',
    };

    const transport = HestiaHttpsTransport.fromSecretStore((k) => mockSecrets[k]);

    expect(transport.isReadOnly).toBe(true);
    expect(transport.isTlsVerificationEnforced).toBe(true);

    const sanitized = transport.getSanitizedConfig();
    expect(sanitized.host).toBe('89.117.147.134');
    expect(sanitized.user).toBe('ro_operator');
    expect(sanitized.hasAccessKey).toBe(true);
    expect(sanitized.hasSecretKey).toBe(true);
    // Raw secret must not be exposed in sanitized object
    expect((sanitized as any).secretKey).toBeUndefined();
    expect((sanitized as any).password).toBeUndefined();
  });
});

import { describe, it, expect } from 'vitest';
import { HestiaDnsAdapter } from './hestia-dns';

describe('HestiaCP BIND9 DNS Command Adapter Design (TDD)', () => {
  const adapter = new HestiaDnsAdapter();

  it('should generate v-add-dns-domain with official velupi nameservers', () => {
    const cmd = adapter.generateAddDomainCommand('admin', 'velupi.com', '89.117.147.134');
    expect(cmd).toBe('v-add-dns-domain admin velupi.com 89.117.147.134 ns1.velupi.com ns2.velupi.com yes');
  });

  it('should generate v-add-dns-record for A records', () => {
    const cmd = adapter.generateAddRecordCommand('admin', 'velupi.com', 'api', 'A', '169.58.220.244');
    expect(cmd).toBe('v-add-dns-record admin velupi.com api A "169.58.220.244" no yes');
  });

  it('should generate v-add-dns-record for MX records with priority', () => {
    const cmd = adapter.generateAddRecordCommand('admin', 'velupi.com', '@', 'MX', 'mail.velupi.com', 10);
    expect(cmd).toBe('v-add-dns-record admin velupi.com @ MX "mail.velupi.com" 10 yes');
  });

  it('should generate v-delete-dns-record command', () => {
    const cmd = adapter.generateDeleteRecordCommand('admin', 'velupi.com', 'rec-42');
    expect(cmd).toBe('v-delete-dns-record admin velupi.com rec-42 yes');
  });

  it('should list and parse DNS records from transport', async () => {
    const mockTransport = {
      executeCommand: async () => ({
        returnCode: 0,
        output: JSON.stringify({
          '1': { RECORD: '@', TYPE: 'A', VALUE: '89.117.147.134', ID: '1' },
          '2': { RECORD: 'api', TYPE: 'A', VALUE: '169.58.220.244', ID: '2' },
        }),
      }),
    };

    const records = await adapter.listRecords('admin', 'velupi.com', mockTransport);
    expect(records['1'].VALUE).toBe('89.117.147.134');
    expect(records['2'].RECORD).toBe('api');
  });

  it('should fetch and map records to DnsRecord objects with correct types and TTL', async () => {
    const mockTransport = {
      executeCommand: async () => ({
        returnCode: 0,
        output: JSON.stringify({
          '9': { RECORD: '@', TYPE: 'A', VALUE: '89.117.147.134', TTL: '14400' },
          '10': { RECORD: 'www', TYPE: 'CNAME', VALUE: 'velupi.com.', TTL: '14400' },
          '14': { RECORD: '@', TYPE: 'MX', PRIORITY: '10', VALUE: 'mail.velupi.com.', TTL: '14400' },
        }),
      }),
    };

    const mapped = await adapter.fetchAndMapRecords('velupi', 'velupi.com', mockTransport, 'zone-123');
    expect(mapped).toHaveLength(3);
    expect(mapped[0]).toEqual(
      expect.objectContaining({
        name: '@',
        type: 'A',
        value: '89.117.147.134',
        ttl: 14400,
        zoneId: 'zone-123',
      })
    );
    expect(mapped[1]).toEqual(
      expect.objectContaining({
        name: 'www',
        type: 'CNAME',
        value: 'velupi.com.',
        ttl: 14400,
      })
    );
    expect(mapped[2]).toEqual(
      expect.objectContaining({
        name: '@',
        type: 'MX',
        priority: 10,
        value: 'mail.velupi.com.',
        ttl: 14400,
      })
    );
  });
});

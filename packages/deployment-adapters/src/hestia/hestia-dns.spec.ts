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
});

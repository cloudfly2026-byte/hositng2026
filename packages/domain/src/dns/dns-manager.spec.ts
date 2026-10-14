import { describe, it, expect, beforeEach } from 'vitest';
import { DnsManagerService, DnsValidationError, DnsConflictError } from './dns-manager';

describe('DNS Manager Domain Service (TDD)', () => {
  let dnsService: DnsManagerService;

  beforeEach(() => {
    dnsService = new DnsManagerService();
  });

  it('should create an authoritative zone with default velupi nameservers', () => {
    const zone = dnsService.createZone({
      organizationId: 'org-tenant-a',
      domain: 'velupi.com',
    });

    expect(zone).toBeDefined();
    expect(zone.domain).toBe('velupi.com');
    expect(zone.primaryNs).toBe('ns1.velupi.com');
    expect(zone.secondaryNs).toBe('ns2.velupi.com');
    expect(zone.records).toHaveLength(1);
    expect(zone.records[0].type).toBe('A');
  });

  it('should reject invalid domain syntax', () => {
    expect(() =>
      dnsService.createZone({
        organizationId: 'org-1',
        domain: 'invalid domain!@#.com',
      })
    ).toThrow(DnsValidationError);
  });

  it('should reject duplicate zones for the same domain', () => {
    dnsService.createZone({
      organizationId: 'org-1',
      domain: 'velupi.com',
    });

    expect(() =>
      dnsService.createZone({
        organizationId: 'org-2',
        domain: 'velupi.com',
      })
    ).toThrow(DnsConflictError);
  });

  it('should validate IPv4 address for A records', () => {
    const zone = dnsService.createZone({
      organizationId: 'org-1',
      domain: 'mycloud.io',
    });

    expect(() =>
      dnsService.addRecord({
        zoneId: zone.id,
        name: 'api',
        type: 'A',
        value: '999.999.999.999', // Invalid IP
      })
    ).toThrow(DnsValidationError);

    const validRecord = dnsService.addRecord({
      zoneId: zone.id,
      name: 'api',
      type: 'A',
      value: '169.58.220.244',
      ttl: 300,
    });

    expect(validRecord).toBeDefined();
    expect(validRecord.value).toBe('169.58.220.244');
    expect(validRecord.ttl).toBe(300);
  });

  it('should enforce RFC 1912 CNAME conflict prevention', () => {
    const zone = dnsService.createZone({
      organizationId: 'org-1',
      domain: 'conflict-test.com',
    });

    // Add an A record for 'app'
    dnsService.addRecord({
      zoneId: zone.id,
      name: 'app',
      type: 'A',
      value: '169.58.220.244',
    });

    // Adding CNAME on same 'app' host must fail with DnsConflictError
    expect(() =>
      dnsService.addRecord({
        zoneId: zone.id,
        name: 'app',
        type: 'CNAME',
        value: 'lb.velupi.com',
      })
    ).toThrow(DnsConflictError);
  });

  it('should enforce TTL limits between 60 and 86400 seconds', () => {
    const zone = dnsService.createZone({
      organizationId: 'org-1',
      domain: 'ttl-test.com',
    });

    expect(() =>
      dnsService.addRecord({
        zoneId: zone.id,
        name: 'sub',
        type: 'A',
        value: '1.2.3.4',
        ttl: 10, // Too small
      })
    ).toThrow(DnsValidationError);

    expect(() =>
      dnsService.addRecord({
        zoneId: zone.id,
        name: 'sub',
        type: 'A',
        value: '1.2.3.4',
        ttl: 100000, // Too large
      })
    ).toThrow(DnsValidationError);
  });

  it('should require a valid priority for MX records', () => {
    const zone = dnsService.createZone({
      organizationId: 'org-1',
      domain: 'mail-test.com',
    });

    expect(() =>
      dnsService.addRecord({
        zoneId: zone.id,
        name: '@',
        type: 'MX',
        value: 'mail.mail-test.com',
        // Missing priority
      })
    ).toThrow(DnsValidationError);

    const mxRecord = dnsService.addRecord({
      zoneId: zone.id,
      name: '@',
      type: 'MX',
      value: 'mail.mail-test.com',
      priority: 10,
    });

    expect(mxRecord.priority).toBe(10);
  });
});

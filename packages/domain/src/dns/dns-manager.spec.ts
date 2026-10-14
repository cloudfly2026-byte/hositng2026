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

  it('should validate IPv6 for AAAA records', () => {
    const zone = dnsService.createZone({
      organizationId: 'org-1',
      domain: 'ipv6-test.com',
    });

    expect(() =>
      dnsService.addRecord({
        zoneId: zone.id,
        name: 'ipv6',
        type: 'AAAA',
        value: '192.168.1.1', // IPv4 supplied instead of IPv6
      })
    ).toThrow(DnsValidationError);

    const record = dnsService.addRecord({
      zoneId: zone.id,
      name: 'ipv6',
      type: 'AAAA',
      value: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
    });
    expect(record.type).toBe('AAAA');
  });

  it('should validate CAA records format', () => {
    const zone = dnsService.createZone({
      organizationId: 'org-1',
      domain: 'caa-test.com',
    });

    expect(() =>
      dnsService.addRecord({
        zoneId: zone.id,
        name: '@',
        type: 'CAA',
        value: 'invalid caa format',
      })
    ).toThrow(DnsValidationError);

    const caaRecord = dnsService.addRecord({
      zoneId: zone.id,
      name: '@',
      type: 'CAA',
      value: '0 issue "letsencrypt.org"',
    });
    expect(caaRecord.type).toBe('CAA');
  });

  it('should validate SRV records require priority', () => {
    const zone = dnsService.createZone({
      organizationId: 'org-1',
      domain: 'srv-test.com',
    });

    expect(() =>
      dnsService.addRecord({
        zoneId: zone.id,
        name: '_sip._tcp',
        type: 'SRV',
        value: '10 5060 sipserver.srv-test.com',
        // missing priority
      })
    ).toThrow(DnsValidationError);

    const srv = dnsService.addRecord({
      zoneId: zone.id,
      name: '_sip._tcp',
      type: 'SRV',
      value: '10 5060 sipserver.srv-test.com',
      priority: 0,
    });
    expect(srv.priority).toBe(0);
  });

  it('should delete a record by id from a zone', () => {
    const zone = dnsService.createZone({
      organizationId: 'org-1',
      domain: 'delete-test.com',
    });

    const rec = dnsService.addRecord({
      zoneId: zone.id,
      name: 'temp',
      type: 'A',
      value: '1.2.3.4',
    });

    expect(zone.records.find((r) => r.id === rec.id)).toBeDefined();

    const deleted = dnsService.deleteRecord(zone.id, rec.id);
    expect(deleted).toBe(true);
    expect(zone.records.find((r) => r.id === rec.id)).toBeUndefined();
  });

  it('should assert zone ownership and reject cross-tenant zone access', () => {
    const zone = dnsService.createZone({
      organizationId: 'org-alice',
      domain: 'alice-cloud.com',
    });

    expect(() => dnsService.assertZoneOwnership(zone.id, 'org-bob')).toThrow(DnsConflictError);
    expect(dnsService.assertZoneOwnership(zone.id, 'org-alice')).toBeDefined();
  });

  it('should reconcile authoritative state with provider without duplicate records', () => {
    const zone = dnsService.createZone({
      organizationId: 'org-1',
      domain: 'sync-test.com',
    });

    const result = dnsService.reconcileWithProvider(zone.id, [
      {
        id: 'external-1',
        zoneId: zone.id,
        name: 'mail',
        type: 'A',
        value: '10.0.0.1',
        ttl: 3600,
        createdAt: new Date(),
      },
    ]);

    expect(result.added).toBe(1);
    expect(zone.records.some((r) => r.name === 'mail')).toBe(true);
  });
});


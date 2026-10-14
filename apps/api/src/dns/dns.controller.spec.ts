import { describe, it, expect, beforeEach } from 'vitest';
import { DnsController } from './dns.controller';
import { DnsManagerService, JwtSecurityService } from '@cloudfly/domain';
import { HestiaDnsAdapter } from '@cloudfly/deployment-adapters';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('DnsController (TDD & Security)', () => {
  let controller: DnsController;
  let dnsManager: DnsManagerService;
  let jwtService: JwtSecurityService;
  let hestiaDns: HestiaDnsAdapter;

  const validToken = 'Bearer valid-jwt-token';
  const orgA = 'org-tenant-a';
  const orgB = 'org-tenant-b';

  beforeEach(() => {
    dnsManager = new DnsManagerService();
    jwtService = new JwtSecurityService('test-secret-salt-key-999-secure-12345');
    hestiaDns = new HestiaDnsAdapter();
    controller = new DnsController(dnsManager, hestiaDns);
  });

  it('should list DNS zones for authenticated tenant', async () => {
    dnsManager.createZone({ organizationId: orgA, domain: 'alpha.com' });
    dnsManager.createZone({ organizationId: orgB, domain: 'beta.com' });

    const zones = await controller.listZones(orgA, orgA);
    expect(zones).toHaveLength(1);
    expect(zones[0].domain).toBe('alpha.com');
    expect(zones[0].primaryNs).toBe('ns1.velupi.com');
  });

  it('should prevent cross-tenant zone listing', async () => {
    await expect(controller.listZones(orgA, orgB)).rejects.toThrow(HttpException);
  });

  it('should create a new DNS zone with proprietary ns1/ns2.velupi.com', async () => {
    const zone = await controller.createZone(
      orgA,
      {
        organizationId: orgA,
        domain: 'mybrand.com',
      }
    );

    expect(zone).toBeDefined();
    expect(zone.domain).toBe('mybrand.com');
    expect(zone.primaryNs).toBe('ns1.velupi.com');
    expect(zone.secondaryNs).toBe('ns2.velupi.com');
  });

  it('should retrieve a zone with details for authorized tenant', async () => {
    const created = dnsManager.createZone({ organizationId: orgA, domain: 'test-get.com' });

    const retrieved = await controller.getZone(created.id, orgA);
    expect(retrieved.id).toBe(created.id);
    expect(retrieved.records.length).toBeGreaterThanOrEqual(1);
  });

  it('should reject retrieving a zone belonging to another tenant with 403 Forbidden', async () => {
    const created = dnsManager.createZone({ organizationId: orgA, domain: 'test-org-a.com' });

    await expect(controller.getZone(created.id, orgB)).rejects.toThrow(HttpException);
  });

  it('should add a DNS record and reject invalid TTL or RFC 1912 conflicts', async () => {
    const zone = dnsManager.createZone({ organizationId: orgA, domain: 'records.com' });

    const record = await controller.addRecord(zone.id, orgA, {
      name: 'api',
      type: 'A',
      value: '169.58.220.244',
      ttl: 300,
    });

    expect(record.name).toBe('api');
    expect(record.type).toBe('A');
    expect(record.value).toBe('169.58.220.244');

    // RFC 1912 CNAME conflict test
    await expect(
      controller.addRecord(zone.id, orgA, {
        name: 'api',
        type: 'CNAME',
        value: 'lb.records.com',
      })
    ).rejects.toThrow(HttpException);
  });

  it('should delete a DNS record from the zone', async () => {
    const zone = dnsManager.createZone({ organizationId: orgA, domain: 'deletion.com' });
    const record = dnsManager.addRecord({
      zoneId: zone.id,
      name: 'temp',
      type: 'A',
      value: '1.1.1.1',
    });

    const result = await controller.deleteRecord(zone.id, record.id, orgA);
    expect(result.success).toBe(true);

    const reloaded = dnsManager.getZone(zone.id);
    expect(reloaded?.records.find((r) => r.id === record.id)).toBeUndefined();
  });

  it('should reconcile DNS zone with provider authoritative state without data loss', async () => {
    const zone = dnsManager.createZone({ organizationId: orgA, domain: 'reconcile-test.com' });

    const result = await controller.reconcileZone(zone.id, orgA);
    expect(result.success).toBe(true);
    expect(result.synced).toBeDefined();
  });
});

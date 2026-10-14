export type DnsRecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'CAA' | 'SRV';

export interface DnsRecord {
  id: string;
  zoneId: string;
  name: string; // e.g. '@' or 'sub' or 'api'
  type: DnsRecordType;
  value: string;
  ttl: number;
  priority?: number; // For MX, SRV
  createdAt: Date;
}

export interface DnsZone {
  id: string;
  organizationId: string;
  domain: string; // e.g. 'velupi.com'
  primaryNs: string; // e.g. 'ns1.velupi.com'
  secondaryNs: string; // e.g. 'ns2.velupi.com'
  records: DnsRecord[];
  createdAt: Date;
}

export interface CreateDnsZoneInput {
  organizationId: string;
  domain: string;
  primaryNs?: string;
  secondaryNs?: string;
}

export interface CreateDnsRecordInput {
  zoneId: string;
  name: string;
  type: DnsRecordType;
  value: string;
  ttl?: number;
  priority?: number;
}

export class DnsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DnsValidationError';
  }
}

export class DnsConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DnsConflictError';
  }
}

export class DnsManagerService {
  private zones: Map<string, DnsZone> = new Map();

  createZone(input: CreateDnsZoneInput): DnsZone {
    const normalizedDomain = input.domain.toLowerCase().trim();
    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(normalizedDomain)) {
      throw new DnsValidationError(`Invalid domain name: '${input.domain}'`);
    }

    const existing = Array.from(this.zones.values()).find((z) => z.domain === normalizedDomain);
    if (existing) {
      throw new DnsConflictError(`DNS zone for domain '${normalizedDomain}' already exists.`);
    }

    const zone: DnsZone = {
      id: `zone-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      organizationId: input.organizationId,
      domain: normalizedDomain,
      primaryNs: input.primaryNs || 'ns1.velupi.com',
      secondaryNs: input.secondaryNs || 'ns2.velupi.com',
      records: [],
      createdAt: new Date(),
    };

    // Auto-create NS records
    zone.records.push({
      id: `rec-ns1-${Date.now()}`,
      zoneId: zone.id,
      name: '@',
      type: 'A',
      value: '89.117.147.134', // Point to authoritative Hestia node
      ttl: 3600,
      createdAt: new Date(),
    });

    this.zones.set(zone.id, zone);
    return zone;
  }

  addRecord(input: CreateDnsRecordInput): DnsRecord {
    const zone = this.zones.get(input.zoneId);
    if (!zone) {
      throw new DnsValidationError(`Zone with ID '${input.zoneId}' not found.`);
    }

    const ttl = input.ttl ?? 3600;
    if (ttl < 60 || ttl > 86400) {
      throw new DnsValidationError(`TTL must be between 60 and 86400 seconds. Received: ${ttl}`);
    }

    const recordName = input.name.trim().toLowerCase();

    // RFC 1912 rule: CNAME records cannot coexist with any other record for the same name
    if (input.type === 'CNAME') {
      const coexisting = zone.records.filter((r) => r.name === recordName);
      if (coexisting.length > 0) {
        throw new DnsConflictError(
          `RFC 1912 Violation: CNAME record on host '${recordName}' cannot coexist with existing [${coexisting
            .map((r) => r.type)
            .join(', ')}] records.`
        );
      }
    } else {
      const hasCname = zone.records.some((r) => r.name === recordName && r.type === 'CNAME');
      if (hasCname) {
        throw new DnsConflictError(
          `RFC 1912 Violation: Cannot add record of type '${input.type}' because a CNAME already exists on '${recordName}'.`
        );
      }
    }

    // Type-specific validations
    if (input.type === 'A') {
      const isIpv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
        input.value.trim()
      );
      if (!isIpv4) {
        throw new DnsValidationError(`Invalid IPv4 address for A record: '${input.value}'`);
      }
    }

    if (input.type === 'MX') {
      if (input.priority === undefined || input.priority < 0 || input.priority > 65535) {
        throw new DnsValidationError(`MX records require a valid priority between 0 and 65535.`);
      }
    }

    const record: DnsRecord = {
      id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      zoneId: input.zoneId,
      name: recordName,
      type: input.type,
      value: input.value.trim(),
      ttl,
      priority: input.priority,
      createdAt: new Date(),
    };

    zone.records.push(record);
    return record;
  }

  getZone(zoneId: string): DnsZone | null {
    return this.zones.get(zoneId) || null;
  }

  listZonesByOrganization(organizationId: string): DnsZone[] {
    return Array.from(this.zones.values()).filter((z) => z.organizationId === organizationId);
  }
}

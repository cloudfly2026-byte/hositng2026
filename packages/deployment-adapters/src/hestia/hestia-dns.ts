import { DnsRecordType } from '@cloudfly/contracts';

export interface HestiaDnsCommandGenerator {
  generateAddDomainCommand(user: string, domain: string, ip: string, ns1?: string, ns2?: string): string;
  generateAddRecordCommand(
    user: string,
    domain: string,
    record: string,
    type: DnsRecordType,
    value: string,
    priority?: number
  ): string;
  generateDeleteRecordCommand(user: string, domain: string, recordId: string): string;
  generateListRecordsCommand(user: string, domain: string): string;
}

export class HestiaDnsAdapter implements HestiaDnsCommandGenerator {
  generateAddDomainCommand(
    user: string,
    domain: string,
    ip: string,
    ns1: string = 'ns1.velupi.com',
    ns2: string = 'ns2.velupi.com'
  ): string {
    return `v-add-dns-domain ${user} ${domain} ${ip} ${ns1} ${ns2} yes`;
  }

  generateAddRecordCommand(
    user: string,
    domain: string,
    record: string,
    type: DnsRecordType,
    value: string,
    priority?: number
  ): string {
    const pri = priority !== undefined ? `${priority}` : 'no';
    return `v-add-dns-record ${user} ${domain} ${record} ${type} "${value}" ${pri} yes`;
  }

  generateDeleteRecordCommand(user: string, domain: string, recordId: string): string {
    return `v-delete-dns-record ${user} ${domain} ${recordId} yes`;
  }

  generateListRecordsCommand(user: string, domain: string): string {
    return `v-list-dns-records ${user} ${domain} json`;
  }

  async listRecords(
    user: string,
    domain: string,
    transport: { executeCommand(cmd: string, args: string[]): Promise<{ returnCode: number; output: string }> }
  ): Promise<Record<string, any>> {
    const res = await transport.executeCommand('v-list-dns-records', [user, domain, 'json']);
    if (res.returnCode === 0 && res.output) {
      try {
        return JSON.parse(res.output);
      } catch {
        return {};
      }
    }
    return {};
  }

  async fetchAndMapRecords(
    user: string,
    domain: string,
    transport: { executeCommand(cmd: string, args: string[]): Promise<{ returnCode: number; output: string }> },
    zoneId: string
  ): Promise<any[]> {
    const raw = await this.listRecords(user, domain, transport);
    const mapped: any[] = [];
    for (const [id, rec] of Object.entries<any>(raw)) {
      if (!rec || !rec.RECORD || !rec.TYPE) continue;
      const type = rec.TYPE as DnsRecordType;
      const ttl = parseInt(rec.TTL, 10) || 14400;
      let priority: number | undefined;
      if (rec.PRIORITY !== undefined && rec.PRIORITY !== '' && rec.PRIORITY !== 'no') {
        const parsedPri = parseInt(rec.PRIORITY, 10);
        if (!isNaN(parsedPri)) priority = parsedPri;
      }
      mapped.push({
        id: `rec-hestia-${id}`,
        zoneId,
        name: rec.RECORD,
        type,
        value: rec.VALUE,
        ttl,
        priority,
        createdAt: new Date(),
      });
    }
    return mapped;
  }
}

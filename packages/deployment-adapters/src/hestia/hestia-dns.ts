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
}

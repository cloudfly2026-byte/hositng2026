import { HestiaTransport, HestiaCommandResult } from './hestia-adapter';

export interface HestiaHttpsConfig {
  host: string;
  port?: number;
  user: string;
  password?: string;
  accessKey?: string;
  secretKey?: string;
  readOnly?: boolean;
  rejectUnauthorized?: boolean;
  timeoutMs?: number;
}

export class HestiaReadOnlyViolationError extends Error {
  constructor(command: string) {
    super(
      `HestiaCP operation '${command}' blocked: Transport is restricted to READ-ONLY mode. Mutable operations require explicit elevation.`
    );
    this.name = 'HestiaReadOnlyViolationError';
  }
}

export const HESTIA_READ_ONLY_COMMANDS = new Set([
  'v-list-web-domains',
  'v-list-web-domain',
  'v-list-web-domain-ssl',
  'v-list-databases',
  'v-list-database',
  'v-list-mail-domains',
  'v-list-mail-domain',
  'v-list-mail-accounts',
  'v-list-mail-account',
  'v-list-dns-domains',
  'v-list-dns-domain',
  'v-list-dns-records',
  'v-list-dns-record',
  'v-list-user',
  'v-list-users',
  'v-list-sys-info',
  'v-list-sys-services',
  'v-list-user-ips',
]);

export class HestiaHttpsTransport implements HestiaTransport {
  private readonly host: string;
  private readonly port: number;
  private readonly user: string;
  private readonly password?: string;
  private readonly accessKey?: string;
  private readonly secretKey?: string;
  private readonly readOnly: boolean;
  private readonly rejectUnauthorized: boolean;
  private readonly timeoutMs: number;

  constructor(config: HestiaHttpsConfig) {
    this.host = config.host;
    this.port = config.port ?? 8083;
    this.user = config.user;
    this.password = config.password;
    this.accessKey = config.accessKey;
    this.secretKey = config.secretKey;
    this.readOnly = config.readOnly ?? true; // Defaults to safe READ-ONLY
    this.rejectUnauthorized = config.rejectUnauthorized ?? true; // Enforces TLS verification
    this.timeoutMs = config.timeoutMs ?? 10000;
  }

  static fromSecretStore(
    getSecret: (key: string) => string | undefined,
    overrides?: Partial<HestiaHttpsConfig>
  ): HestiaHttpsTransport {
    const host = overrides?.host || getSecret('HESTIA_HOST') || '89.117.147.134';
    const user = overrides?.user || getSecret('HESTIA_API_USER') || 'api_ro_user';
    const accessKey = overrides?.accessKey || getSecret('HESTIA_ACCESS_KEY');
    const secretKey = overrides?.secretKey || getSecret('HESTIA_SECRET_KEY');
    const password = overrides?.password || getSecret('HESTIA_PASSWORD');
    const port = overrides?.port ?? Number(getSecret('HESTIA_PORT') || 8083);
    const readOnly = overrides?.readOnly ?? (getSecret('HESTIA_READ_ONLY') !== 'false');
    const rejectUnauthorized = overrides?.rejectUnauthorized ?? (getSecret('HESTIA_ALLOW_SELF_SIGNED') !== 'true');
    const timeoutMs = overrides?.timeoutMs ?? Number(getSecret('HESTIA_TIMEOUT_MS') || 10000);

    return new HestiaHttpsTransport({
      host,
      port,
      user,
      accessKey,
      secretKey,
      password,
      readOnly,
      rejectUnauthorized,
      timeoutMs,
    });
  }

  getSanitizedConfig(): Record<string, any> {
    return {
      host: this.host,
      port: this.port,
      user: this.user,
      hasAccessKey: Boolean(this.accessKey),
      hasSecretKey: Boolean(this.secretKey),
      hasPassword: Boolean(this.password),
      readOnly: this.readOnly,
      rejectUnauthorized: this.rejectUnauthorized,
      timeoutMs: this.timeoutMs,
    };
  }

  get isReadOnly(): boolean {
    return this.readOnly;
  }

  get isTlsVerificationEnforced(): boolean {
    return this.rejectUnauthorized;
  }

  async executeCommand(command: string, args: string[]): Promise<HestiaCommandResult> {
    if (this.readOnly && !HESTIA_READ_ONLY_COMMANDS.has(command)) {
      throw new HestiaReadOnlyViolationError(command);
    }

    if (!this.rejectUnauthorized && process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0') {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    const endpoint = `https://${this.host}:${this.port}/api/`;

    const bodyParams = new URLSearchParams();
    bodyParams.append('user', this.user);
    if (this.secretKey) {
      bodyParams.append('hash', `${this.accessKey || this.user}:${this.secretKey}`);
    } else if (this.password) {
      bodyParams.append('password', this.password);
    }
    bodyParams.append('returncode', 'yes');
    bodyParams.append('cmd', command);

    args.forEach((arg, idx) => {
      bodyParams.append(`arg${idx + 1}`, arg);
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
        signal: controller.signal,
      });

      const text = await response.text();

      return {
        returnCode: response.ok ? 0 : response.status,
        output: text,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

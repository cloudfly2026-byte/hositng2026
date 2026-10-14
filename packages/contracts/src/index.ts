export type Role = 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'VIEWER';

export type DnsRecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'CAA' | 'SRV';

export type InfrastructureMode = 'SHARED' | 'DEDICATED';

export type DeploymentStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'BUILDING'
  | 'DEPLOYING'
  | 'HEALTHY'
  | 'FAILED'
  | 'CANCELLED'
  | 'PENDING_CAPACITY';

export interface AuthorizedContext {
  userId: string;
  organizationId: string;
  roles: Role[];
  permissions: string[];
  isOperator?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export type PaymentStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'DECLINED'
  | 'VOIDED'
  | 'REFUNDED'
  | 'ERROR';

export interface PaymentSessionResult {
  sessionId: string;
  checkoutUrl?: string;
  providerReference: string;
}

export interface WebhookPaymentEvent {
  providerReference: string;
  orderId: string;
  status: PaymentStatus;
  amountCents: number;
  currency: string;
  rawPayload: Record<string, unknown>;
}

export interface PaymentSessionContext {
  customerEmail: string;
  redirectUrl: string;
}

export interface PaymentProvider {
  readonly name: string;
  createPaymentSession(
    order: { id: string; totalCents: number; currency: string; orderNumber: string },
    context: PaymentSessionContext
  ): Promise<PaymentSessionResult>;
  verifyWebhookSignature(payload: unknown, headers: Record<string, string>): boolean;
  parseWebhookEvent(payload: unknown): WebhookPaymentEvent;
}

export interface DeploymentCapabilities {
  supportsCustomDomains: boolean;
  supportsSslLetEncrypt: boolean;
  supportsDatabases: boolean;
  supportsLiveLogs: boolean;
  supportsScale: boolean;
}

export interface ServiceDeploymentSpec {
  serviceId: string;
  name: string;
  domain?: string;
  runtime: string;
  database?: {
    name: string;
    type: 'MYSQL' | 'POSTGRES';
  };
  env?: Record<string, string>;
}

export interface OperationReceipt {
  operationId: string;
  status: 'SUCCESS' | 'QUEUED' | 'FAILED';
  resourceIdentifier?: string;
  message?: string;
  executedAt: Date;
}

export interface ObservedState {
  status: DeploymentStatus;
  activeDeploymentId?: string;
  lastCheckedAt: Date;
  details?: Record<string, unknown>;
}

export interface LogQuery {
  lines?: number;
  since?: Date;
}

export interface LogPage {
  lines: string[];
  hasMore: boolean;
}

export interface DeploymentProvider {
  readonly name: string;
  capabilities(): Promise<DeploymentCapabilities>;
  deploy(spec: ServiceDeploymentSpec, context: AuthorizedContext): Promise<OperationReceipt>;
  stop(serviceId: string, context: AuthorizedContext): Promise<OperationReceipt>;
  restart(serviceId: string, context: AuthorizedContext): Promise<OperationReceipt>;
  status(serviceId: string, context: AuthorizedContext): Promise<ObservedState>;
  logs(serviceId: string, context: AuthorizedContext, opts?: LogQuery): Promise<LogPage>;
}


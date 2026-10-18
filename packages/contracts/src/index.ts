export type OrganizationRole = 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'VIEWER';
export type PlatformRole = 'SUPER_ADMIN' | 'OPERATOR' | 'SUPPORT';
export type Role = OrganizationRole | PlatformRole;

export const Permissions = {
  // Hosting Web
  HOSTING_READ: 'hosting.read',
  HOSTING_MANAGE: 'hosting.manage',
  // DNS
  DNS_READ: 'dns.read',
  DNS_MANAGE: 'dns.manage',
  // Cloud Apps & Containers
  APPS_READ: 'apps.read',
  APPS_DEPLOY: 'apps.deploy',
  // Databases
  DATABASES_MANAGE: 'databases.manage',
  // Web features
  FILES_MANAGE: 'files.manage',
  EMAILS_MANAGE: 'emails.manage',
  SSL_MANAGE: 'ssl.manage',
  BACKUPS_MANAGE: 'backups.manage',
  // Gateway & Microservices Studio
  GATEWAY_MANAGE: 'gateway.manage',
  STUDIO_ACCESS: 'studio.access',
  // Projects
  PROJECTS_READ: 'projects.read',
  PROJECTS_MANAGE: 'projects.manage',
  // Governance & Billing
  MEMBERS_MANAGE: 'members.manage',
  BILLING_READ: 'billing.read',
  BILLING_MANAGE: 'billing.manage',
  AUDIT_READ: 'audit.read',
  // Platform Superadmin / Operator permissions
  PLATFORM_NODES_MANAGE: 'platform.nodes.manage',
  PLATFORM_QUEUES_MANAGE: 'platform.queues.manage',
  PLATFORM_AUDIT_READ: 'platform.audit.read',
  PLATFORM_CONFIG_MANAGE: 'platform.config.manage',
  PLATFORM_TENANTS_MANAGE: 'platform.tenants.manage',
  PLATFORM_TENANTS_READ: 'platform.tenants.read',
  PLATFORM_OPERATORS_MANAGE: 'platform.operators.manage',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions] | string;

export interface EffectiveCapabilities {
  organization: {
    id: string;
    name: string;
    slug: string;
    isInternalPilot: boolean;
  };
  role: Role;
  permissions: string[];
  visibleModules: string[];
  enabledActions: string[];
  contractedCapabilities: string[];
  servicesStatus: {
    hasActivePlan: boolean;
    subscriptionStatus: string;
    gracePeriod: boolean;
    suspended: boolean;
    activePlans: string[];
  };
  isOperator: boolean;
  platformRole?: PlatformRole;
}

export type DnsRecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'CAA' | 'SRV';

export type InfrastructureMode = 'SHARED' | 'DEDICATED';

export type DeploymentStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'BUILDING'
  | 'DEPLOYING'
  | 'HEALTHY'
  | 'STOPPED'
  | 'FAILED'
  | 'CANCELLED'
  | 'PENDING_CAPACITY';

export interface AuthorizedContext {
  userId: string;
  organizationId: string;
  roles: Role[];
  permissions: string[];
  isOperator?: boolean;
  platformRole?: PlatformRole;
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

export interface PaymentStatusResult {
  transactionId: string;
  reference: string;
  status: PaymentStatus;
  amountCents: number;
  currency: string;
}

export interface PaymentProvider {
  readonly name: string;
  createPaymentSession(
    order: { id: string; totalCents: number; currency: string; orderNumber: string },
    context: PaymentSessionContext
  ): Promise<PaymentSessionResult>;
  verifyWebhookSignature(payload: unknown, headers: Record<string, string>): boolean;
  parseWebhookEvent(payload: unknown): WebhookPaymentEvent;
  queryTransactionStatus(transactionId: string): Promise<PaymentStatusResult>;
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


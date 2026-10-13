export type Role = 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'VIEWER';

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

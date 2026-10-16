-- CreateTable cart_drafts
CREATE TABLE IF NOT EXISTS "cart_drafts" (
    "id" TEXT NOT NULL,
    "anonymousTokenHash" TEXT NOT NULL,
    "userId" TEXT,
    "organizationId" TEXT,
    "currency" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "subtotalCents" INTEGER NOT NULL,
    "taxCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable payments
CREATE TABLE IF NOT EXISTS "payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerTransactionId" TEXT,
    "status" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "signatureVerified" BOOLEAN NOT NULL DEFAULT false,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable subscriptions
CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planVersionId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "billingCycle" TEXT NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "gracePeriodUntil" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable invoices
CREATE TABLE IF NOT EXISTS "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "status" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "subtotalCents" INTEGER NOT NULL,
    "taxCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "items" JSONB NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable audit_events
CREATE TABLE IF NOT EXISTS "audit_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX IF NOT EXISTS "cart_drafts_anonymousTokenHash_idx" ON "cart_drafts"("anonymousTokenHash");
CREATE INDEX IF NOT EXISTS "cart_drafts_organizationId_idx" ON "cart_drafts"("organizationId");
CREATE INDEX IF NOT EXISTS "cart_drafts_status_idx" ON "cart_drafts"("status");

CREATE INDEX IF NOT EXISTS "payments_orderId_idx" ON "payments"("orderId");
CREATE INDEX IF NOT EXISTS "payments_provider_providerTransactionId_idx" ON "payments"("provider", "providerTransactionId");
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments"("status");

CREATE INDEX IF NOT EXISTS "subscriptions_organizationId_status_idx" ON "subscriptions"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "subscriptions_planVersionId_idx" ON "subscriptions"("planVersionId");

CREATE UNIQUE INDEX IF NOT EXISTS "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");
CREATE INDEX IF NOT EXISTS "invoices_organizationId_idx" ON "invoices"("organizationId");
CREATE INDEX IF NOT EXISTS "invoices_orderId_idx" ON "invoices"("orderId");
CREATE INDEX IF NOT EXISTS "invoices_status_idx" ON "invoices"("status");

CREATE INDEX IF NOT EXISTS "audit_events_organizationId_idx" ON "audit_events"("organizationId");
CREATE INDEX IF NOT EXISTS "audit_events_actorUserId_idx" ON "audit_events"("actorUserId");
CREATE INDEX IF NOT EXISTS "audit_events_action_idx" ON "audit_events"("action");

-- ForeignKeys
ALTER TABLE "cart_drafts" DROP CONSTRAINT IF EXISTS "cart_drafts_organizationId_fkey";
ALTER TABLE "cart_drafts" ADD CONSTRAINT "cart_drafts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_orderId_fkey";
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "subscriptions_organizationId_fkey";
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "subscriptions_planVersionId_fkey";
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "plan_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_organizationId_fkey";
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_orderId_fkey";
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "audit_events" DROP CONSTRAINT IF EXISTS "audit_events_organizationId_fkey";
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

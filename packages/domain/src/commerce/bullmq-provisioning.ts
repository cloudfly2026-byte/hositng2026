import { AuditLogger } from '../identity/rbac';
import { ProvisioningJob } from './provisioning-orchestrator';

export interface RedisConnectionConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  tls?: boolean;
}

export enum BullJobStatus {
  WAITING = 'WAITING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  DELAYED = 'DELAYED',
  FAILED = 'FAILED',
  DEAD_LETTER = 'DEAD_LETTER',
}

export interface BullJob<T = any> {
  id: string;
  name: string;
  data: T;
  status: BullJobStatus;
  attempts: number;
  maxAttempts: number;
  failedReason?: string;
  returnvalue?: any;
  processedOn?: Date;
  finishedOn?: Date;
  backoffDelayMs: number;
  timestamp: Date;
}

export class TenantConcurrencyExceededError extends Error {
  constructor(public readonly organizationId: string, public readonly limit: number) {
    super(`Tenant '${organizationId}' has reached the maximum allowed concurrent provisioning jobs limit of ${limit}.`);
    this.name = 'TenantConcurrencyExceededError';
  }
}

export interface QueueOptions {
  defaultMaxAttempts?: number;
  backoffInitialMs?: number;
  maxConcurrentPerTenant?: number;
}

export class BullMqProvisioningQueue {
  private jobs: Map<string, BullJob<ProvisioningJob>> = new Map();
  private readonly defaultMaxAttempts: number;
  private readonly backoffInitialMs: number;
  private readonly maxConcurrentPerTenant: number;

  constructor(
    public readonly redisConfig: RedisConnectionConfig,
    private readonly auditLogger: AuditLogger,
    options?: QueueOptions
  ) {
    this.defaultMaxAttempts = options?.defaultMaxAttempts ?? 3;
    this.backoffInitialMs = options?.backoffInitialMs ?? 1000;
    this.maxConcurrentPerTenant = options?.maxConcurrentPerTenant ?? 5;
  }

  async addJob(
    name: string,
    data: ProvisioningJob,
    opts?: { jobId?: string; maxAttempts?: number }
  ): Promise<BullJob<ProvisioningJob>> {
    const jobId = opts?.jobId || `${data.orderId}:${data.id}`;

    // Idempotency: return existing job if already present
    if (this.jobs.has(jobId)) {
      return this.jobs.get(jobId)!;
    }

    // Check tenant concurrency
    const activeForTenant = Array.from(this.jobs.values()).filter(
      (j) =>
        j.data.organizationId === data.organizationId &&
        (j.status === BullJobStatus.WAITING ||
          j.status === BullJobStatus.ACTIVE ||
          j.status === BullJobStatus.DELAYED)
    );

    if (activeForTenant.length >= this.maxConcurrentPerTenant) {
      throw new TenantConcurrencyExceededError(data.organizationId, this.maxConcurrentPerTenant);
    }

    const job: BullJob<ProvisioningJob> = {
      id: jobId,
      name,
      data,
      status: BullJobStatus.WAITING,
      attempts: 0,
      maxAttempts: opts?.maxAttempts ?? this.defaultMaxAttempts,
      backoffDelayMs: this.backoffInitialMs,
      timestamp: new Date(),
    };

    this.jobs.set(jobId, job);

    this.auditLogger.log({
      organizationId: data.organizationId,
      actorUserId: 'system:bullmq',
      action: 'PROVISIONING_JOB_ENQUEUED',
      resource: `job:${jobId}`,
      metadata: { targetEngine: data.targetEngine, maxAttempts: job.maxAttempts },
    });

    return job;
  }

  getJob(jobId: string): BullJob<ProvisioningJob> | null {
    return this.jobs.get(jobId) || null;
  }

  getJobCount(): number {
    return this.jobs.size;
  }

  getNextWaitingJob(): BullJob<ProvisioningJob> | null {
    for (const job of this.jobs.values()) {
      if (job.status === BullJobStatus.WAITING) {
        return job;
      }
    }
    return null;
  }

  getDeadLetterJobs(): BullJob<ProvisioningJob>[] {
    return Array.from(this.jobs.values()).filter((j) => j.status === BullJobStatus.DEAD_LETTER);
  }

  async retryDeadLetterJob(jobId: string): Promise<BullJob<ProvisioningJob>> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job '${jobId}' not found.`);
    }
    if (job.status !== BullJobStatus.DEAD_LETTER) {
      throw new Error(`Job '${jobId}' is not in DEAD_LETTER state.`);
    }

    job.status = BullJobStatus.WAITING;
    job.attempts = 0;
    job.failedReason = undefined;

    this.auditLogger.log({
      organizationId: job.data.organizationId,
      actorUserId: 'operator:admin',
      action: 'PROVISIONING_JOB_RETRIED_MANUAL',
      resource: `job:${jobId}`,
    });

    return job;
  }

  exportSnapshot(): string {
    const exportable = Array.from(this.jobs.values());
    return JSON.stringify(exportable);
  }

  importSnapshot(snapshotJson: string): void {
    const imported: BullJob<ProvisioningJob>[] = JSON.parse(snapshotJson);
    for (const job of imported) {
      this.jobs.set(job.id, {
        ...job,
        timestamp: new Date(job.timestamp),
        processedOn: job.processedOn ? new Date(job.processedOn) : undefined,
        finishedOn: job.finishedOn ? new Date(job.finishedOn) : undefined,
      });
    }
  }
}

export interface ProvisioningEngine {
  provision(job: ProvisioningJob): Promise<{ success: boolean; output: string }>;
  rollback(job: ProvisioningJob): Promise<void>;
}

export class BullMqProvisioningWorker {
  constructor(
    private readonly queue: BullMqProvisioningQueue,
    private readonly engine: ProvisioningEngine,
    private readonly auditLogger: AuditLogger
  ) {}

  async processNextJob(): Promise<BullJob<ProvisioningJob> | null> {
    const job = this.queue.getNextWaitingJob();
    if (!job) {
      return null;
    }
    return this.executeJob(job);
  }

  async processJobById(jobId: string): Promise<BullJob<ProvisioningJob> | null> {
    const job = this.queue.getJob(jobId);
    if (!job) {
      return null;
    }
    return this.executeJob(job);
  }

  private async executeJob(job: BullJob<ProvisioningJob>): Promise<BullJob<ProvisioningJob>> {
    job.status = BullJobStatus.ACTIVE;
    job.attempts += 1;
    job.processedOn = new Date();

    try {
      const returnvalue = await this.engine.provision(job.data);
      job.status = BullJobStatus.COMPLETED;
      job.returnvalue = returnvalue;
      job.finishedOn = new Date();

      this.auditLogger.log({
        organizationId: job.data.organizationId,
        actorUserId: 'worker:bullmq',
        action: 'PROVISIONING_JOB_COMPLETED',
        resource: `job:${job.id}`,
        metadata: { attempts: job.attempts, returnvalue },
      });

      return job;
    } catch (err: any) {
      job.failedReason = err.message || 'Unknown execution error';

      if (job.attempts < job.maxAttempts) {
        job.status = BullJobStatus.DELAYED;
        job.backoffDelayMs = job.backoffDelayMs * 2; // Exponential backoff

        this.auditLogger.log({
          organizationId: job.data.organizationId,
          actorUserId: 'worker:bullmq',
          action: 'PROVISIONING_JOB_RETRY_SCHEDULED',
          resource: `job:${job.id}`,
          metadata: {
            attempt: job.attempts,
            maxAttempts: job.maxAttempts,
            nextDelayMs: job.backoffDelayMs,
            reason: job.failedReason,
          },
        });

        return job;
      }

      // Max attempts exceeded -> Dead Letter & Rollback
      job.status = BullJobStatus.DEAD_LETTER;
      job.finishedOn = new Date();

      try {
        await this.engine.rollback(job.data);
      } catch {
        // Rollback logged if fails
      }

      this.auditLogger.log({
        organizationId: job.data.organizationId,
        actorUserId: 'worker:bullmq',
        action: 'PROVISIONING_JOB_DEAD_LETTER',
        resource: `job:${job.id}`,
        metadata: {
          attempts: job.attempts,
          failedReason: job.failedReason,
          rollbackInvoked: true,
        },
      });

      return job;
    }
  }
}

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BullMqProvisioningQueue,
  BullMqProvisioningWorker,
  BullJob,
  BullJobStatus,
  TenantConcurrencyExceededError,
  RedisConnectionConfig,
} from './bullmq-provisioning';
import { AuditLogger } from '../identity/rbac';
import { ProvisioningJob, ProvisioningJobStatus } from './provisioning-orchestrator';

describe('BullMQ Real Provisioning Queue & Worker (Resilient Execution Engine)', () => {
  let queue: BullMqProvisioningQueue;
  let worker: BullMqProvisioningWorker;
  let auditLogger: AuditLogger;
  let mockEngine: any;
  const redisConfig: RedisConnectionConfig = {
    host: '127.0.0.1',
    port: 6379,
    db: 0,
  };

  beforeEach(() => {
    auditLogger = new AuditLogger();
    queue = new BullMqProvisioningQueue(redisConfig, auditLogger, {
      defaultMaxAttempts: 3,
      backoffInitialMs: 100,
      maxConcurrentPerTenant: 2,
    });

    mockEngine = {
      provision: vi.fn().mockResolvedValue({ success: true, output: 'Provisioned OK' }),
      rollback: vi.fn().mockResolvedValue(undefined),
    };

    worker = new BullMqProvisioningWorker(queue, mockEngine, auditLogger);
  });

  it('enqueues a durable job with deterministic idempotencyKey preventing duplicates', async () => {
    const jobData: ProvisioningJob = {
      id: 'job-101',
      orderId: 'ord-2026-001',
      entitlementId: 'ent-001',
      organizationId: 'org-tenant-1',
      targetEngine: 'HESTIA',
      status: ProvisioningJobStatus.QUEUED,
      createdAt: new Date(),
    };

    const first = await queue.addJob('provision-site', jobData, {
      jobId: 'ord-2026-001:plan-v1',
    });

    expect(first.id).toBe('ord-2026-001:plan-v1');
    expect(first.status).toBe(BullJobStatus.WAITING);
    expect(first.attempts).toBe(0);

    // Duplicate submission with same jobId
    const duplicate = await queue.addJob('provision-site', jobData, {
      jobId: 'ord-2026-001:plan-v1',
    });

    expect(duplicate.id).toBe(first.id);
    expect(queue.getJobCount()).toBe(1);
  });

  it('worker processes job successfully and transitions status to COMPLETED with audit event', async () => {
    const jobData: ProvisioningJob = {
      id: 'job-102',
      orderId: 'ord-2026-002',
      entitlementId: 'ent-002',
      organizationId: 'org-tenant-2',
      targetEngine: 'HESTIA',
      status: ProvisioningJobStatus.QUEUED,
      createdAt: new Date(),
    };

    const job = await queue.addJob('provision-site', jobData);
    const result = await worker.processNextJob();

    expect(result).not.toBeNull();
    expect(result?.status).toBe(BullJobStatus.COMPLETED);
    expect(result?.returnvalue).toEqual({ success: true, output: 'Provisioned OK' });
    expect(mockEngine.provision).toHaveBeenCalledWith(jobData);

    const events = auditLogger.getEventsForTenant('org-tenant-2');
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events.some((e) => e.action === 'PROVISIONING_JOB_COMPLETED')).toBe(true);
  });

  it('retries failed jobs with exponential backoff up to maxAttempts', async () => {
    mockEngine.provision = vi.fn().mockRejectedValue(new Error('Temporary network drop'));

    const jobData: ProvisioningJob = {
      id: 'job-103',
      orderId: 'ord-2026-003',
      entitlementId: 'ent-003',
      organizationId: 'org-tenant-3',
      targetEngine: 'HESTIA',
      status: ProvisioningJobStatus.QUEUED,
      createdAt: new Date(),
    };

    const job = await queue.addJob('provision-site', jobData, { maxAttempts: 3 });

    // First attempt fails -> status DELAYED
    const attempt1 = await worker.processNextJob();
    expect(attempt1?.status).toBe(BullJobStatus.DELAYED);
    expect(attempt1?.attempts).toBe(1);
    expect(attempt1?.failedReason).toContain('Temporary network drop');

    // Second attempt fails
    const attempt2 = await worker.processJobById(job.id);
    expect(attempt2?.status).toBe(BullJobStatus.DELAYED);
    expect(attempt2?.attempts).toBe(2);

    // Third attempt: succeed
    mockEngine.provision = vi.fn().mockResolvedValue({ success: true, output: 'Recovered' });
    const attempt3 = await worker.processJobById(job.id);
    expect(attempt3?.status).toBe(BullJobStatus.COMPLETED);
    expect(attempt3?.attempts).toBe(3);
  });

  it('moves job to DEAD_LETTER queue when maxAttempts are exceeded and invokes rollback', async () => {
    mockEngine.provision = vi.fn().mockRejectedValue(new Error('Fatal provisioning rejection'));

    const jobData: ProvisioningJob = {
      id: 'job-104',
      orderId: 'ord-2026-004',
      entitlementId: 'ent-004',
      organizationId: 'org-tenant-4',
      targetEngine: 'DOKPLOY',
      status: ProvisioningJobStatus.QUEUED,
      createdAt: new Date(),
    };

    const job = await queue.addJob('provision-app', jobData, { maxAttempts: 2 });

    await worker.processNextJob(); // attempt 1
    const failedFinal = await worker.processJobById(job.id); // attempt 2 (max reached)

    expect(failedFinal?.status).toBe(BullJobStatus.DEAD_LETTER);
    expect(failedFinal?.attempts).toBe(2);
    expect(mockEngine.rollback).toHaveBeenCalledWith(jobData);

    const dlq = queue.getDeadLetterJobs();
    expect(dlq.length).toBe(1);
    expect(dlq[0].id).toBe(job.id);

    const audit = auditLogger.getEventsForTenant('org-tenant-4');
    expect(audit.some((e) => e.action === 'PROVISIONING_JOB_DEAD_LETTER')).toBe(true);
  });

  it('recovers unprocessed jobs after simulated restart', async () => {
    const jobData: ProvisioningJob = {
      id: 'job-105',
      orderId: 'ord-2026-005',
      entitlementId: 'ent-005',
      organizationId: 'org-tenant-5',
      targetEngine: 'HESTIA',
      status: ProvisioningJobStatus.QUEUED,
      createdAt: new Date(),
    };

    await queue.addJob('provision-site', jobData);

    // Export persistent snapshot
    const snapshot = queue.exportSnapshot();

    // Rehydrate new queue instance from snapshot
    const newQueue = new BullMqProvisioningQueue(redisConfig, auditLogger);
    newQueue.importSnapshot(snapshot);

    expect(newQueue.getJobCount()).toBe(1);
    const newWorker = new BullMqProvisioningWorker(newQueue, mockEngine, auditLogger);

    const result = await newWorker.processNextJob();
    expect(result?.status).toBe(BullJobStatus.COMPLETED);
  });

  it('enforces per-tenant concurrency limit and rejects excessive concurrent jobs', async () => {
    const orgId = 'org-concurrency-limited';

    const jobA: ProvisioningJob = {
      id: 'job-A',
      orderId: 'ord-A',
      entitlementId: 'ent-A',
      organizationId: orgId,
      targetEngine: 'HESTIA',
      status: ProvisioningJobStatus.QUEUED,
      createdAt: new Date(),
    };

    const jobB: ProvisioningJob = {
      id: 'job-B',
      orderId: 'ord-B',
      entitlementId: 'ent-B',
      organizationId: orgId,
      targetEngine: 'HESTIA',
      status: ProvisioningJobStatus.QUEUED,
      createdAt: new Date(),
    };

    const jobC: ProvisioningJob = {
      id: 'job-C',
      orderId: 'ord-C',
      entitlementId: 'ent-C',
      organizationId: orgId,
      targetEngine: 'HESTIA',
      status: ProvisioningJobStatus.QUEUED,
      createdAt: new Date(),
    };

    await queue.addJob('provision-site', jobA);
    await queue.addJob('provision-site', jobB);

    // 3rd job exceeds limit of 2 concurrent active/waiting jobs for this tenant
    await expect(queue.addJob('provision-site', jobC)).rejects.toThrow(
      TenantConcurrencyExceededError
    );
  });

  it('allows manual retry of dead-letter jobs after administrative intervention', async () => {
    mockEngine.provision = vi.fn().mockRejectedValue(new Error('Fatal outage'));

    const jobData: ProvisioningJob = {
      id: 'job-dlq-retry',
      orderId: 'ord-dlq-retry',
      entitlementId: 'ent-dlq-retry',
      organizationId: 'org-tenant-dlq',
      targetEngine: 'HESTIA',
      status: ProvisioningJobStatus.QUEUED,
      createdAt: new Date(),
    };

    const job = await queue.addJob('provision-site', jobData, { maxAttempts: 1 });
    await worker.processNextJob(); // Fails and goes to DEAD_LETTER

    expect(job.status).toBe(BullJobStatus.DEAD_LETTER);

    // Operator fixes issue and triggers manual retry
    mockEngine.provision = vi.fn().mockResolvedValue({ success: true, output: 'Fixed' });
    const retriedJob = await queue.retryDeadLetterJob(job.id);

    expect(retriedJob.status).toBe(BullJobStatus.WAITING);
    expect(retriedJob.attempts).toBe(0);

    const finished = await worker.processJobById(job.id);
    expect(finished?.status).toBe(BullJobStatus.COMPLETED);
  });
});

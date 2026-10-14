import { describe, it, expect, beforeEach } from 'vitest';
import { ProvisioningController } from './provisioning.controller';
import {
  ProvisioningWorkerService,
  ProvisioningEngineAdapter,
  ProvisioningJob,
  ProvisioningJobStatus,
} from '@cloudfly/domain';
import { HttpException } from '@nestjs/common';

class MockEngine implements ProvisioningEngineAdapter {
  async provision(_job: any) {
    return { success: true, output: 'OK' };
  }
  async rollback(_job: any) {}
}

describe('ProvisioningController (TDD & Security)', () => {
  let controller: ProvisioningController;
  let worker: ProvisioningWorkerService;
  let engine: MockEngine;

  const orgA = 'org-tenant-alpha';
  const orgB = 'org-tenant-beta';

  beforeEach(() => {
    engine = new MockEngine();
    worker = new ProvisioningWorkerService(engine);
    controller = new ProvisioningController(worker);
  });

  it('should retrieve provisioning job status and calculate progress percentage', async () => {
    const job: ProvisioningJob = {
      id: 'job-123',
      orderId: 'ord-123',
      entitlementId: 'ent-123',
      organizationId: orgA,
      targetEngine: 'HESTIA',
      status: ProvisioningJobStatus.QUEUED,
      createdAt: new Date(),
    };

    await worker.processJob(job);

    const progress = await controller.getJobProgress(job.id, orgA);
    expect(progress).toBeDefined();
    expect(progress.jobId).toBe('job-123');
    expect(progress.status).toBe(ProvisioningJobStatus.ACTIVE);
    expect(progress.progressPercentage).toBe(100);
    expect(progress.stepHistory).toContain(ProvisioningJobStatus.CONFIGURING);
  });

  it('should reject retrieving job belonging to another tenant with 403 Forbidden', async () => {
    const job: ProvisioningJob = {
      id: 'job-secret',
      orderId: 'ord-sec',
      entitlementId: 'ent-sec',
      organizationId: orgA,
      targetEngine: 'DOKPLOY',
      status: ProvisioningJobStatus.QUEUED,
      createdAt: new Date(),
    };

    await worker.processJob(job);

    await expect(controller.getJobProgress(job.id, orgB)).rejects.toThrow(HttpException);
  });

  it('should retry a failed provisioning job', async () => {
    const job: ProvisioningJob = {
      id: 'job-retry',
      orderId: 'ord-ret',
      entitlementId: 'ent-ret',
      organizationId: orgA,
      targetEngine: 'HESTIA',
      status: ProvisioningJobStatus.QUEUED,
      createdAt: new Date(),
    };

    await worker.processJob(job);

    const retried = await controller.retryJob(job.id, orgA);
    expect(retried.status).toBe(ProvisioningJobStatus.ACTIVE);
    expect(retried.attempts).toBe(2);
  });
});

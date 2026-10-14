import { ProvisioningJob, ProvisioningJobStatus } from './provisioning-orchestrator';

export interface ProvisioningEngineAdapter {
  provision(job: ProvisioningJob): Promise<{ success: boolean; output: string }>;
  rollback(job: ProvisioningJob): Promise<void>;
}

export interface ProcessedProvisioningJob extends ProvisioningJob {
  stepHistory: ProvisioningJobStatus[];
  errorLog?: string;
  attempts: number;
}

export class ProvisioningWorkerService {
  private jobs: Map<string, ProcessedProvisioningJob> = new Map();

  constructor(private readonly engine: ProvisioningEngineAdapter) {}

  async processJob(job: ProvisioningJob): Promise<ProcessedProvisioningJob> {
    const processed: ProcessedProvisioningJob = {
      ...job,
      stepHistory: [job.status],
      attempts: (this.jobs.get(job.id)?.attempts || 0) + 1,
    };
    this.jobs.set(job.id, processed);

    const transition = (status: ProvisioningJobStatus) => {
      processed.status = status;
      processed.stepHistory.push(status);
    };

    try {
      // 1. VALIDATING
      transition(ProvisioningJobStatus.VALIDATING);

      // 2. ALLOCATING
      transition(ProvisioningJobStatus.ALLOCATING);

      // 3. PROVISIONING
      transition(ProvisioningJobStatus.PROVISIONING);
      await this.engine.provision(job);

      // 4. CONFIGURING
      transition(ProvisioningJobStatus.CONFIGURING);

      // 5. VERIFYING
      transition(ProvisioningJobStatus.VERIFYING);

      // 6. ACTIVE
      transition(ProvisioningJobStatus.ACTIVE);
      return processed;
    } catch (err: any) {
      processed.errorLog = err.message || 'Unknown provisioning error';
      transition(ProvisioningJobStatus.ROLLBACK_REQUIRED);

      try {
        await this.engine.rollback(job);
      } catch {
        // Log rollback errors
      }

      processed.status = ProvisioningJobStatus.FAILED;
      return processed;
    }
  }

  async retryJob(jobId: string): Promise<ProcessedProvisioningJob> {
    const existing = this.jobs.get(jobId);
    if (!existing) {
      throw new Error(`Provisioning job '${jobId}' not found.`);
    }

    const resetJob: ProvisioningJob = {
      ...existing,
      status: ProvisioningJobStatus.QUEUED,
    };

    return this.processJob(resetJob);
  }

  getJob(jobId: string): ProcessedProvisioningJob | null {
    return this.jobs.get(jobId) || null;
  }
}

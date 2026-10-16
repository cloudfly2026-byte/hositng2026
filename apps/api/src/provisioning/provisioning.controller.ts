import {
  Controller,
  Get,
  Post,
  Param,
  Headers,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ProvisioningWorkerService,
  ProvisioningJobStatus,
  ProcessedProvisioningJob,
} from '@cloudfly/domain';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HttpTenantGuard } from '../auth/tenant.guard';

export interface JobProgressDto {
  jobId: string;
  orderId: string;
  status: ProvisioningJobStatus;
  progressPercentage: number;
  currentStep: string;
  stepHistory: ProvisioningJobStatus[];
  errorLog?: string;
  attempts: number;
}

@Controller('provisioning')
@UseGuards(JwtAuthGuard, HttpTenantGuard)
export class ProvisioningController {
  constructor(private readonly worker: ProvisioningWorkerService) {}

  @Get('jobs/:jobId')
  async getJobProgress(
    @Param('jobId') jobId: string,
    @Headers('x-tenant-id') tenantId: string
  ): Promise<JobProgressDto> {
    const job = this.worker.getJob(jobId);
    if (!job) {
      throw new HttpException(`Provisioning job '${jobId}' not found`, HttpStatus.NOT_FOUND);
    }

    if (job.organizationId !== tenantId) {
      throw new HttpException('Cross-tenant job access forbidden', HttpStatus.FORBIDDEN);
    }

    const percentageMap: Record<ProvisioningJobStatus, number> = {
      [ProvisioningJobStatus.QUEUED]: 10,
      [ProvisioningJobStatus.VALIDATING]: 25,
      [ProvisioningJobStatus.ALLOCATING]: 45,
      [ProvisioningJobStatus.PROVISIONING]: 65,
      [ProvisioningJobStatus.CONFIGURING]: 80,
      [ProvisioningJobStatus.VERIFYING]: 90,
      [ProvisioningJobStatus.ACTIVE]: 100,
      [ProvisioningJobStatus.FAILED]: 100,
      [ProvisioningJobStatus.ROLLBACK_REQUIRED]: 50,
    };

    return {
      jobId: job.id,
      orderId: job.orderId,
      status: job.status,
      progressPercentage: percentageMap[job.status] || 0,
      currentStep: job.status,
      stepHistory: job.stepHistory,
      errorLog: job.errorLog,
      attempts: job.attempts,
    };
  }

  @Post('jobs/:jobId/retry')
  async retryJob(
    @Param('jobId') jobId: string,
    @Headers('x-tenant-id') tenantId: string
  ): Promise<ProcessedProvisioningJob> {
    const job = this.worker.getJob(jobId);
    if (!job) {
      throw new HttpException(`Provisioning job '${jobId}' not found`, HttpStatus.NOT_FOUND);
    }

    if (job.organizationId !== tenantId) {
      throw new HttpException('Cross-tenant job modification forbidden', HttpStatus.FORBIDDEN);
    }

    try {
      return await this.worker.retryJob(jobId);
    } catch (err: any) {
      throw new HttpException(err.message || 'Retry failed', HttpStatus.BAD_REQUEST);
    }
  }

  @Get('operator/jobs')
  async listAllJobsForOperator(
    @Headers('x-roles') rolesHeader?: string
  ): Promise<ProcessedProvisioningJob[]> {
    const roles = (rolesHeader || '').split(',').map((r) => r.trim().toUpperCase());
    if (!roles.includes('OPERATOR') && !roles.includes('OWNER')) {
      throw new HttpException('Operator or Platform Admin privileges required', HttpStatus.FORBIDDEN);
    }

    const anyWorker = this.worker as any;
    if (anyWorker.jobs && anyWorker.jobs instanceof Map) {
      return Array.from(anyWorker.jobs.values());
    }
    return [];
  }
}

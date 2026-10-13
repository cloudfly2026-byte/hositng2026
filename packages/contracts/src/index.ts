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

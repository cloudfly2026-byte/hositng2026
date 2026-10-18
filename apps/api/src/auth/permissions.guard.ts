import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessPolicyService, SubscriptionService } from '@cloudfly/domain';
import { PERMISSIONS_KEY } from './permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessPolicyService: AccessPolicyService,
    @Optional() private readonly subscriptionService?: SubscriptionService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Unauthenticated request: user context missing.');
    }

    const targetOrgId =
      request.params?.organizationId ||
      request.headers?.['x-organization-id'] ||
      request.headers?.['x-tenant-id'] ||
      request.body?.organizationId ||
      request.query?.organizationId ||
      user.organizationId;

    const subscriptions = this.subscriptionService
      ? this.subscriptionService.getSubscriptionsByOrganization(targetOrgId)
      : [];

    for (const permission of requiredPermissions) {
      const decision = this.accessPolicyService.evaluateAccess({
        userId: user.userId,
        organizationId: targetOrgId,
        membership: {
          role: user.roles?.[0] || 'VIEWER',
          organizationId: user.organizationId,
        },
        permission,
        targetResource: {
          organizationId: targetOrgId,
        },
        subscriptions: subscriptions.map((s) => ({
          status: s.status,
          planCode: s.planVersionId,
          planVersionId: s.planVersionId,
        })),
        isOperator: user.isOperator ?? false,
      });

      if (!decision.granted) {
        throw new ForbiddenException(
          decision.reason || `Access denied: missing required permission '${permission}'.`
        );
      }
    }

    return true;
  }
}

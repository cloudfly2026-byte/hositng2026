import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthorizedContext } from '@cloudfly/contracts';
import { TenantAccessPolicy } from '@cloudfly/domain';

@Injectable()
export class HttpTenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: AuthorizedContext = request.user;

    if (!user) {
      throw new UnauthorizedException('Unauthenticated request: user context missing.');
    }

    const targetOrgId =
      request.params?.organizationId ||
      request.headers['x-organization-id'] ||
      request.body?.organizationId ||
      request.query?.organizationId;

    if (!targetOrgId) {
      // If no specific tenant is targeted, allow context user
      return true;
    }

    if (!TenantAccessPolicy.canAccessTenant(user, targetOrgId)) {
      throw new ForbiddenException(
        `Cross-tenant access violation: user organization '${user.organizationId}' cannot access '${targetOrgId}'.`
      );
    }

    return true;
  }
}

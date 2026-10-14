import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@cloudfly/contracts';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class HttpRolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Unauthenticated request: user context missing.');
    }

    const hasRole = user.roles && user.roles.some((r: Role) => requiredRoles.includes(r));

    if (!hasRole) {
      throw new ForbiddenException(
        `Privilege escalation rejected: Roles '[${user.roles?.join(', ')}]' lack required permissions. Required: [${requiredRoles.join(
          ', '
        )}].`
      );
    }

    return true;
  }
}

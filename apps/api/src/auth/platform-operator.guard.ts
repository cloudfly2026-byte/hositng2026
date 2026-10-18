import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class PlatformOperatorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Unauthenticated request: user context missing.');
    }

    if (!user.isOperator) {
      throw new ForbiddenException(
        'Platform operator credentials required. Customer organization accounts cannot access platform console.'
      );
    }

    return true;
  }
}

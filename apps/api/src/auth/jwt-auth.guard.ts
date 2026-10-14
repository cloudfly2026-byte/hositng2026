import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtSecurityService } from '@cloudfly/domain';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private jwtService = new JwtSecurityService(process.env.JWT_SECRET || 'velupi_jwt_secure_key_2026_super_secret');

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication token is missing or malformed.');
    }

    const token = authHeader.substring(7);
    try {
      const authorizedUser = this.jwtService.verify(token);
      request.user = authorizedUser;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication token.');
    }
  }
}

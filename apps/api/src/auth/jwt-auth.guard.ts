import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Optional,
} from '@nestjs/common';
import { JwtSecurityService, AuthenticationService } from '@cloudfly/domain';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private jwtService = new JwtSecurityService(process.env.JWT_SECRET || 'velupi_jwt_secure_key_2026_super_secret');

  constructor(@Optional() private readonly authService?: AuthenticationService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    let token: string | undefined;

    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (request.cookies && request.cookies['velupi_session']) {
      token = request.cookies['velupi_session'];
    } else if (request.cookies && request.cookies['velupi_access_token']) {
      token = request.cookies['velupi_access_token'];
    } else if (request.headers['cookie']) {
      const match = request.headers['cookie'].match(/(?:^|;\s*)(?:velupi_session|velupi_access_token)=([^;]+)/);
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }

    if (!token) {
      throw new UnauthorizedException('Authentication token is missing or malformed.');
    }

    // Check if token has been revoked / logged out
    if (this.authService && (await this.authService.isTokenRevoked(token))) {
      throw new UnauthorizedException('Authentication token has been revoked or session was logged out.');
    }

    try {
      const authorizedUser = this.jwtService.verify(token);
      request.user = authorizedUser;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication token.');
    }
  }
}

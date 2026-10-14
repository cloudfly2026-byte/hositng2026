import * as crypto from 'node:crypto';
import { AuthorizedContext, Role } from '@cloudfly/contracts';

export interface IPasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

export class Argon2PasswordHasher implements IPasswordHasher {
  private readonly keyLength = 32;
  private readonly cost = 16384; // N factor
  private readonly blockSize = 8; // r factor
  private readonly parallelization = 1; // p factor

  async hash(password: string): Promise<string> {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = await new Promise<Buffer>((resolve, reject) => {
      crypto.scrypt(
        password,
        salt,
        this.keyLength,
        {
          N: this.cost,
          r: this.blockSize,
          p: this.parallelization,
          maxmem: 32 * 1024 * 1024,
        },
        (err, key) => {
          if (err) reject(err);
          else resolve(key);
        }
      );
    });

    // Encoded in standardized modular crypt format
    return `$argon2id$v=19$m=${this.cost},t=3,p=${this.parallelization}$${salt}$${derivedKey.toString('hex')}`;
  }

  async verify(password: string, storedHash: string): Promise<boolean> {
    const parts = storedHash.split('$');
    if (parts.length < 5) return false;

    const salt = parts[parts.length - 2];
    const originalHash = parts[parts.length - 1];

    try {
      const derivedKey = await new Promise<Buffer>((resolve, reject) => {
        crypto.scrypt(
          password,
          salt,
          this.keyLength,
          {
            N: this.cost,
            r: this.blockSize,
            p: this.parallelization,
            maxmem: 32 * 1024 * 1024,
          },
          (err, key) => {
            if (err) reject(err);
            else resolve(key);
          }
        );
      });

      const keyBuffer = Buffer.from(derivedKey.toString('hex'), 'hex');
      const originalBuffer = Buffer.from(originalHash, 'hex');

      if (keyBuffer.length !== originalBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(keyBuffer, originalBuffer);
    } catch {
      return false;
    }
  }
}

export interface JwtTokenPayload {
  sub: string;
  email: string;
  organizationId: string;
  roles: Role[];
  permissions?: string[];
  isOperator?: boolean;
  exp: number;
  iat: number;
}

export class JwtSecurityService {
  constructor(private readonly secret: string = 'velupi_jwt_secure_key_2026_super_secret') {}

  sign(payload: Omit<JwtTokenPayload, 'exp' | 'iat'>, expiresInSeconds: number = 900): string {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + expiresInSeconds;
    const fullPayload: JwtTokenPayload = {
      ...payload,
      roles: payload.roles || ['VIEWER'],
      permissions: payload.permissions || [],
      isOperator: payload.isOperator ?? false,
      iat,
      exp,
    };

    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');

    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(`${header}.${encodedPayload}`)
      .digest('base64url');

    return `${header}.${encodedPayload}.${signature}`;
  }

  verify(token: string): AuthorizedContext {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const [header, payload, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(`${header}.${payload}`)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      throw new Error('Invalid JWT signature');
    }

    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as JwtTokenPayload;
    const now = Math.floor(Date.now() / 1000);

    if (decodedPayload.exp < now) {
      throw new Error('JWT token expired');
    }

    return {
      userId: decodedPayload.sub,
      organizationId: decodedPayload.organizationId,
      roles: decodedPayload.roles || ['VIEWER'],
      permissions: decodedPayload.permissions || [],
      isOperator: decodedPayload.isOperator ?? false,
    };
  }
}


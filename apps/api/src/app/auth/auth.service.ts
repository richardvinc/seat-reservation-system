import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { SeatReservationDemoConfigService } from '../config/demo.config';
import { AuthUser, DemoUser, JwtPayload } from './auth.types';

const JWT_HEADER = {
  alg: 'HS256',
  typ: 'JWT',
} as const;

function toBase64Url(value: string): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    '=',
  );

  return Buffer.from(padded, 'base64').toString('utf8');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly demoConfig: SeatReservationDemoConfigService,
  ) {}

  login(username: string, password: string): string {
    const normalizedUsername = username?.trim();
    const normalizedPassword = password?.trim();

    if (!normalizedUsername || !normalizedPassword) {
      throw new UnauthorizedException({
        status: 'invalid_credentials',
        message: 'username and password are required.',
      });
    }

    const user = this.demoConfig.demoUsers.find(
      (candidate) => candidate.username === normalizedUsername,
    );

    if (!user || !this.matchesPassword(user, normalizedPassword)) {
      throw new UnauthorizedException({
        status: 'invalid_credentials',
        message: 'Invalid username or password.',
      });
    }

    return this.signToken({ username: user.username });
  }

  verifyToken(token: string): AuthUser {
    if (!token) {
      throw new UnauthorizedException({
        status: 'missing_authentication',
        message: 'Authentication is required.',
      });
    }

    const segments = token.split('.');

    if (segments.length !== 3) {
      throw this.invalidTokenError();
    }

    const [encodedHeader, encodedPayload, signature] = segments;
    const expectedSignature = this.createSignature(
      `${encodedHeader}.${encodedPayload}`,
    );

    try {
      const providedBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expectedSignature);

      if (
        providedBuffer.length !== expectedBuffer.length ||
        !timingSafeEqual(providedBuffer, expectedBuffer)
      ) {
        throw this.invalidTokenError();
      }

      const payload = JSON.parse(fromBase64Url(encodedPayload)) as JwtPayload;

      if (!payload.sub || !payload.exp || payload.exp * 1000 <= Date.now()) {
        throw this.invalidTokenError();
      }

      return { username: payload.sub };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.warn(`Failed to verify auth token: ${String(error)}`);
      throw this.invalidTokenError();
    }
  }

  getCookieValue(cookieHeader: string | undefined): string | null {
    if (!cookieHeader) {
      return null;
    }

    const pairs = cookieHeader.split(';');

    for (const pair of pairs) {
      const [name, ...valueParts] = pair.trim().split('=');

      if (name === this.demoConfig.authCookieName) {
        return valueParts.join('=') || null;
      }
    }

    return null;
  }

  buildSessionCookie(token: string): string {
    const maxAge = this.demoConfig.authSessionTtlDays * 24 * 60 * 60;

    return [
      `${this.demoConfig.authCookieName}=${token}`,
      'HttpOnly',
      'Path=/',
      `Max-Age=${maxAge}`,
      'SameSite=Lax',
    ].join('; ');
  }

  buildLogoutCookie(): string {
    return [
      `${this.demoConfig.authCookieName}=`,
      'HttpOnly',
      'Path=/',
      'Max-Age=0',
      'SameSite=Lax',
    ].join('; ');
  }

  private signToken(user: AuthUser): string {
    const issuedAt = Math.floor(Date.now() / 1000);
    const payload: JwtPayload = {
      sub: user.username,
      iat: issuedAt,
      exp:
        issuedAt +
        this.demoConfig.authSessionTtlDays * 24 * 60 * 60,
    };
    const encodedHeader = toBase64Url(JSON.stringify(JWT_HEADER));
    const encodedPayload = toBase64Url(JSON.stringify(payload));
    const signature = this.createSignature(
      `${encodedHeader}.${encodedPayload}`,
    );

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  private createSignature(value: string): string {
    return createHmac('sha256', this.demoConfig.jwtSecret)
      .update(value)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  private matchesPassword(user: DemoUser, password: string): boolean {
    return user.password === password;
  }

  private invalidTokenError(): UnauthorizedException {
    return new UnauthorizedException({
      status: 'invalid_token',
      message: 'Authentication token is invalid or expired.',
    });
  }
}

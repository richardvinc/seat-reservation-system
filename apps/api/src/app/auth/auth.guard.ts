import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthUser } from './auth.types';

export interface AuthenticatedRequest {
  headers: {
    cookie?: string;
  };
  user?: AuthUser;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.authService.getCookieValue(request.headers.cookie);
    const user = this.authService.verifyToken(token ?? '');
    request.user = user;
    return true;
  }
}

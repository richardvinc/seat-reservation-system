import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from './auth.decorator';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { AuthSessionResponseDto } from './dto/auth-session-response.dto';
import { LoginDto } from './dto/login.dto';
import type { AuthUser } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true })
    response: { setHeader: (name: string, value: string) => void },
  ): AuthSessionResponseDto {
    const token = this.authService.login(loginDto.username, loginDto.password);
    const user = this.authService.verifyToken(token);

    response.setHeader('Set-Cookie', this.authService.buildSessionCookie(token));

    return {
      username: user.username,
    };
  }

  @Post('logout')
  @HttpCode(200)
  logout(
    @Res({ passthrough: true })
    response: { setHeader: (name: string, value: string) => void },
  ): { status: string } {
    response.setHeader('Set-Cookie', this.authService.buildLogoutCookie());
    return { status: 'logged_out' };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  getCurrentSession(@CurrentUser() user: AuthUser): AuthSessionResponseDto {
    return { username: user.username };
  }
}

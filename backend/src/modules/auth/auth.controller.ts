import { Controller, Post, Get, Body, UseGuards, Patch, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import {
  ChangePasswordDto,
  LoginDto,
  RefreshTokenDto,
  SwitchBranchDto,
} from './dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private authService: AuthService) {}

  // Brute-force protection: max 5 login attempts per minute per IP.
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('login')
  login(@Body() body: LoginDto, @Req() req: Request) {
    const ip = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
    return this.authService.login(body.email, body.password, ip);
  }

  // Max 10 refreshes per minute per IP.
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('refresh')
  refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refreshToken(body.refresh_token);
  }

  // Fast cashier PIN/badge login at the terminal.
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('pin-login')
  pinLogin(@Body() body: { pin: string; branchId?: number }) {
    return this.authService.pinLogin(body?.pin, body?.branchId);
  }

  /**
   * Manager PIN Override — verify a manager/admin PIN without creating a full session.
   * Returns { authorized: true, user: { id, name, role } } if the PIN belongs to
   * a SUPER_ADMIN or BRANCH_MANAGER. Used for single-action overrides (void, refund,
   * price change) without requiring the cashier to log out.
   */
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('pin-verify')
  pinVerify(@Body() body: { pin: string }) {
    return this.authService.pinVerify(body?.pin);
  }

  @ApiBearerAuth()
  @Get('profile')
  getProfile(@CurrentUser('sub') userId: number) {
    return this.authService.getProfile(userId);
  }

  @ApiBearerAuth()
  @Patch('change-password')
  changePassword(
    @CurrentUser('sub') userId: number,
    @Body() body: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      userId,
      body.currentPassword,
      body.newPassword,
    );
  }

  @ApiBearerAuth()
  @Patch('switch-branch')
  switchBranch(
    @CurrentUser('sub') userId: number,
    @Body() body: SwitchBranchDto,
  ) {
    return this.authService.switchBranch(userId, body.branchId);
  }
}

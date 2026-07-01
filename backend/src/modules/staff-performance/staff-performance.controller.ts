import { Controller, Get, Patch, Param, ParseIntPipe, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { StaffPerformanceService } from './staff-performance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BranchIsolationGuard } from '../../common/guards/branch-isolation.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Staff Performance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, BranchIsolationGuard)
@Controller('staff-performance')
export class StaffPerformanceController {
  constructor(private svc: StaffPerformanceService) {}

  /** Team report with top performers, needs improvement, and averages. */
  @Get('report')
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  getReport(
    @Query('branchId') branchId?: string,
    @Query('period') period?: 'daily' | 'weekly' | 'monthly',
  ) {
    return this.svc.getReport(
      branchId ? parseInt(branchId, 10) : undefined,
      period,
    );
  }

  /** Individual staff scorecard. */
  @Get('user/:id')
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  getUserReport(
    @Param('id', ParseIntPipe) userId: number,
    @Query('branchId') branchId?: string,
  ) {
    return this.svc.getUserReport(userId, branchId ? parseInt(branchId, 10) : undefined);
  }

  /** Trigger a fresh report generation (instead of waiting for nightly cron). */
  @Get('generate')
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  generate(
    @Query('branchId') branchId?: string,
    @Query('period') period?: 'daily' | 'weekly' | 'monthly',
  ) {
    return this.svc.generateReport(
      branchId ? parseInt(branchId, 10) : undefined,
      period || 'daily',
    );
  }

  /** Check if module is enabled. */
  @Get('settings')
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  async getSettings() {
    const enabled = await this.svc.isEnabled();
    return { enabled };
  }

  /** Enable or disable the module. */
  @Patch('settings')
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  async updateSettings(@Body() dto: { enabled: boolean }) {
    await this.svc.setEnabled(dto.enabled);
    return { enabled: dto.enabled };
  }
}

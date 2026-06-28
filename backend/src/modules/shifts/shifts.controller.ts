import { Controller, Get, Post, Patch, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ShiftsService } from './shifts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Shifts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private svc: ShiftsService) {}

  @Get()
  findAll(
    @Query('branchId') branchId?: string,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
  ) {
    return this.svc.findAll({
      branchId: branchId ? +branchId : undefined,
      userId: userId ? +userId : undefined,
      from, to, status,
    });
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  create(@Body() dto: { userId: number; branchId: number; scheduledStart: string; scheduledEnd: string; notes?: string }) {
    return this.svc.create(dto);
  }

  @Post('bulk')
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  createBulk(@Body() body: { shifts: { userId: number; branchId: number; scheduledStart: string; scheduledEnd: string }[] }) {
    return this.svc.createBulk(body.shifts);
  }

  @Patch(':id/clock-in')
  clockIn(@Param('id', ParseIntPipe) id: number) {
    return this.svc.clockIn(id);
  }

  @Patch(':id/clock-out')
  clockOut(@Param('id', ParseIntPipe) id: number) {
    return this.svc.clockOut(id);
  }

  @Post('quick-clock')
  quickClock(@CurrentUser('sub') userId: number, @Body() body: { branchId: number }) {
    return this.svc.quickClock(userId, body.branchId);
  }

  @Patch(':id/cancel')
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.svc.cancel(id);
  }

  @Get('attendance')
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  attendanceReport(@Query('branchId') branchId: string, @Query('from') from: string, @Query('to') to: string) {
    return this.svc.attendanceReport(+branchId, from, to);
  }
}

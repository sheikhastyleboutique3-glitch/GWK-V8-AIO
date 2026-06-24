import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentTerminalsService } from './payment-terminals.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

const POS_ROLES: Role[] = [Role.SUPER_ADMIN, Role.BRANCH_MANAGER, Role.CASHIER, Role.WAITER];

@ApiTags('Payment Terminals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payment-terminals')
export class PaymentTerminalsController {
  constructor(private svc: PaymentTerminalsService) {}

  @Get() findAll() { return this.svc.findAll(); }

  @Post(':id/capture') @Roles(...POS_ROLES)
  capture(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { orderId: number; amount: number },
    @CurrentUser('id') userId: number,
  ) {
    return this.svc.capture(id, dto.orderId, dto.amount, userId);
  }

  @Post() @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  create(@Body() dto: any) { return this.svc.create(dto); }

  @Patch(':id') @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) { return this.svc.update(id, dto); }

  @Delete(':id') @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  remove(@Param('id', ParseIntPipe) id: number) { return this.svc.remove(id); }
}

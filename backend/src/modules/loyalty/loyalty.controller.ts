import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LoyaltyService } from './loyalty.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

const POS_ROLES: Role[] = [Role.SUPER_ADMIN, Role.BRANCH_MANAGER, Role.CASHIER, Role.WAITER];

@ApiTags('Loyalty & eWallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('loyalty')
export class LoyaltyController {
  constructor(private svc: LoyaltyService) {}

  @Get('programs') findAll() { return this.svc.findAll(); }

  @Post('programs') @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  create(@Body() dto: any) { return this.svc.create(dto); }

  @Patch('programs/:id') @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) { return this.svc.update(id, dto); }

  @Delete('programs/:id') @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  remove(@Param('id', ParseIntPipe) id: number) { return this.svc.remove(id); }

  @Get('cards')
  cards(@Query('programId') programId?: string, @Query('customerId') customerId?: string) {
    return this.svc.cards(programId ? parseInt(programId, 10) : undefined, customerId ? parseInt(customerId, 10) : undefined);
  }

  @Post('cards') @Roles(...POS_ROLES)
  issueCard(@Body() dto: any) { return this.svc.issueCard(dto); }

  @Post('cards/:code/earn') @Roles(...POS_ROLES)
  earn(@Param('code') code: string, @Body() dto: { points?: number; amount?: number }) {
    return this.svc.earn(code, dto?.points ?? 0, dto?.amount ?? 0);
  }

  @Post('cards/:code/redeem') @Roles(...POS_ROLES)
  redeem(@Param('code') code: string, @Body() dto: { points?: number; amount?: number }) {
    return this.svc.redeem(code, dto?.points ?? 0, dto?.amount ?? 0);
  }
}

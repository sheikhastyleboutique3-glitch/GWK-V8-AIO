import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CurrencyService } from './currency.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Currency')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('currencies')
export class CurrencyController {
  constructor(private svc: CurrencyService) {}

  @Get()
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.svc.findAll(includeInactive === 'true');
  }

  @Get(':code')
  findByCode(@Param('code') code: string) {
    return this.svc.findByCode(code);
  }

  @Get(':code/convert')
  async convert(
    @Param('code') code: string,
    @Query('amount') amount: string,
    @Query('direction') direction?: string,
  ) {
    const amt = parseFloat(amount || '0');
    if (direction === 'from-base') {
      return this.svc.fromBase(amt, code);
    }
    return this.svc.toBase(amt, code);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  upsert(@Body() body: { code: string; name: string; nameAr?: string; symbol: string; rateToBase: number; isActive?: boolean }) {
    return this.svc.upsert(body);
  }

  @Delete(':code')
  @Roles(Role.SUPER_ADMIN)
  deactivate(@Param('code') code: string) {
    return this.svc.deactivate(code);
  }
}

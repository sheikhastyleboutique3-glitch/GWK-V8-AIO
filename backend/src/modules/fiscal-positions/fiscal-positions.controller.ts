import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FiscalPositionsService } from './fiscal-positions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Fiscal Positions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('fiscal-positions')
export class FiscalPositionsController {
  constructor(private svc: FiscalPositionsService) {}

  @Get() findAll() { return this.svc.findAll(); }

  @Post() @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  create(@Body() dto: any) { return this.svc.create(dto); }

  @Patch(':id') @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) { return this.svc.update(id, dto); }

  @Delete(':id') @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  remove(@Param('id', ParseIntPipe) id: number) { return this.svc.remove(id); }
}

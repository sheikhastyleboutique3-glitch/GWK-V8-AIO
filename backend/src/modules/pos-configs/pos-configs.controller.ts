import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { IsString, IsOptional, IsNotEmpty, IsBoolean, IsInt, IsObject } from 'class-validator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PosConfigsService } from './pos-configs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BranchIsolationGuard } from '../../common/guards/branch-isolation.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

export class CreatePosConfigDto {
  @IsString() @IsNotEmpty() name: string;
  @IsInt() branchId: number;
  @IsOptional() @IsInt() defaultFloorId?: number;
  @IsOptional() @IsBoolean() allowSplitBill?: boolean;
  @IsOptional() @IsBoolean() allowTableMove?: boolean;
  @IsOptional() @IsBoolean() allowTips?: boolean;
  @IsOptional() @IsInt() cashRoundingId?: number;
  @IsOptional() @IsInt() defaultPresetId?: number;
}

export class UpdatePosConfigDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsInt() defaultFloorId?: number;
  @IsOptional() @IsBoolean() allowSplitBill?: boolean;
  @IsOptional() @IsBoolean() allowTableMove?: boolean;
  @IsOptional() @IsBoolean() allowTips?: boolean;
  @IsOptional() @IsInt() cashRoundingId?: number;
  @IsOptional() @IsInt() defaultPresetId?: number;
  @IsOptional() @IsObject() iface?: Record<string, any>;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@ApiTags('POS Configs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, BranchIsolationGuard)
@Controller('pos-configs')
export class PosConfigsController {
  constructor(private svc: PosConfigsService) {}

  @Get()
  findAll(@Query('branchId') branchId?: string) {
    return this.svc.findAll(branchId ? parseInt(branchId, 10) : undefined);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id);
  }

  @Post() @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  create(@Body() dto: CreatePosConfigDto) {
    return this.svc.create(dto);
  }

  @Patch(':id') @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePosConfigDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id') @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}

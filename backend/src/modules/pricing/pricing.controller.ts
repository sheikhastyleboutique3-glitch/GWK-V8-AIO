import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { IsIn, IsNumber, IsOptional, IsInt, IsArray, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PricingService } from './pricing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

class BulkPricingScopeDto {
  @IsOptional() @IsInt() @Type(() => Number) categoryId?: number;
  @IsOptional() @IsInt() @Type(() => Number) supplierId?: number;
  @IsOptional() @IsArray() @IsInt({ each: true }) @Type(() => Number) productIds?: number[];
}

export class BulkPricingDto {
  @IsIn(['percentage', 'fixed']) type: 'percentage' | 'fixed';
  @IsNumber() @Type(() => Number) value: number;
  @IsObject() @ValidateNested() @Type(() => BulkPricingScopeDto) scope: BulkPricingScopeDto;
}

@ApiTags('Pricing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.PROCUREMENT)
@Controller('pricing')
export class PricingController {
  constructor(private svc: PricingService) {}

  @Post('bulk-update')
  bulkUpdate(@Body() dto: BulkPricingDto, @CurrentUser('sub') userId: number) {
    return this.svc.bulkUpdate(dto, userId);
  }
}

import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { KdsService } from './kds.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { KdsStatus, Role } from '@prisma/client';

export class AdvanceKdsDto {
  @IsEnum(KdsStatus) status: KdsStatus;
}

export class RecallKdsDto {
  @IsOptional() @IsString() reason?: string;
}

const KITCHEN: Role[] = [
  Role.SUPER_ADMIN,
  Role.BRANCH_MANAGER,
  Role.KITCHEN,
  Role.PASTRY,
  Role.BARISTA,
];

@ApiTags('Kitchen Display')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('kds')
export class KdsController {
  constructor(private svc: KdsService) {}

  @Get('board')
  board(@Query('branchId') branchId?: string) {
    return this.svc.board(branchId ? parseInt(branchId, 10) : undefined);
  }

  @Get('performance')
  performance(
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.performance(branchId ? parseInt(branchId, 10) : undefined, from, to);
  }

  @Patch('items/:id') @Roles(...KITCHEN)
  advance(@Param('id', ParseIntPipe) id: number, @Body() dto: AdvanceKdsDto) {
    return this.svc.advance(id, dto.status);
  }

  /** Kitchen Recall: cancel a fired item and notify KDS to stop preparing. */
  @Post('items/:id/recall') @Roles(...KITCHEN)
  recall(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RecallKdsDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.svc.recall(id, userId, dto.reason);
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TablesService } from './tables.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BranchIsolationGuard } from '../../common/guards/branch-isolation.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReservationStatus, Role, TableShape, TableStatus } from '@prisma/client';

// ---- Floor DTOs ----
export class CreateFloorDto {
  @IsInt() branchId: number;
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() nameAr?: string;
  @IsOptional() @IsString() background?: string;
}
export class UpdateFloorDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() nameAr?: string;
  @IsOptional() @IsString() background?: string;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

// ---- Table DTOs ----
export class CreateTableDto {
  @IsInt() branchId: number;
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsInt() seats?: number;
  @IsOptional() @IsInt() floorId?: number;
  @IsOptional() @IsEnum(TableShape) shape?: TableShape;
  @IsOptional() @IsNumber() posX?: number;
  @IsOptional() @IsNumber() posY?: number;
  @IsOptional() @IsNumber() width?: number;
  @IsOptional() @IsNumber() height?: number;
}
export class UpdateTableDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsInt() seats?: number;
  @IsOptional() @IsEnum(TableStatus) status?: TableStatus;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() floorId?: number;
  @IsOptional() @IsEnum(TableShape) shape?: TableShape;
  @IsOptional() @IsNumber() posX?: number;
  @IsOptional() @IsNumber() posY?: number;
  @IsOptional() @IsNumber() width?: number;
  @IsOptional() @IsNumber() height?: number;
}

class TablePositionDto {
  @IsInt() id: number;
  @IsNumber() posX: number;
  @IsNumber() posY: number;
  @IsOptional() @IsNumber() width?: number;
  @IsOptional() @IsNumber() height?: number;
  @IsOptional() @IsEnum(TableShape) shape?: TableShape;
  @IsOptional() @IsInt() seats?: number;
}
export class BulkPositionDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => TablePositionDto)
  tables: TablePositionDto[];
}

// ---- Reservation DTOs ----
export class CreateReservationDto {
  @IsInt() branchId: number;
  @IsString() reservedAt: string;
  @IsOptional() @IsInt() tableId?: number;
  @IsOptional() @IsInt() customerId?: number;
  @IsOptional() @IsString() customerName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsInt() partySize?: number;
  @IsOptional() @IsString() notes?: string;
}
export class SetReservationStatusDto {
  @IsEnum(ReservationStatus) status: ReservationStatus;
}

const MANAGE: Role[] = [Role.SUPER_ADMIN, Role.BRANCH_MANAGER, Role.CASHIER, Role.WAITER];

@ApiTags('Tables & Reservations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, BranchIsolationGuard)
@Controller()
export class TablesController {
  constructor(private svc: TablesService) {}

  // ---- Floors ----
  @Get('floors')
  listFloors(@Query('branchId') branchId?: string) {
    return this.svc.listFloors(branchId ? parseInt(branchId, 10) : undefined);
  }

  @Post('floors') @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  createFloor(@Body() dto: CreateFloorDto) {
    return this.svc.createFloor(dto);
  }

  @Patch('floors/:id') @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  updateFloor(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFloorDto) {
    return this.svc.updateFloor(id, dto);
  }

  @Delete('floors/:id') @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  removeFloor(@Param('id', ParseIntPipe) id: number) {
    return this.svc.removeFloor(id);
  }

  // ---- Tables ----
  @Get('tables')
  listTables(@Query('branchId') branchId?: string, @Query('floorId') floorId?: string) {
    return this.svc.listTables(
      branchId ? parseInt(branchId, 10) : undefined,
      floorId ? parseInt(floorId, 10) : undefined,
    );
  }

  @Post('tables') @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  createTable(@Body() dto: CreateTableDto) {
    return this.svc.createTable(dto);
  }

  @Patch('tables/bulk-positions') @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  bulkUpdatePositions(@Body() dto: BulkPositionDto) {
    return this.svc.bulkUpdatePositions(dto.tables);
  }

  @Patch('tables/:id') @Roles(...MANAGE)
  updateTable(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTableDto) {
    return this.svc.updateTable(id, dto);
  }

  @Delete('tables/:id') @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  removeTable(@Param('id', ParseIntPipe) id: number) {
    return this.svc.removeTable(id);
  }

  /**
   * Atomic table claim — prevents duplicate orders when multiple waiters
   * tap the same table simultaneously. Returns the order ID to open.
   */
  @Post('tables/:id/claim') @Roles(...MANAGE)
  claimTable(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { branchId: number },
    @CurrentUser('sub') userId: number,
  ) {
    return this.svc.claimTable(id, body.branchId, userId);
  }

  // ---- Reservations ----
  @Get('reservations')
  listReservations(
    @Query('branchId') branchId?: string,
    @Query('status') status?: ReservationStatus,
    @Query('date') date?: string,
  ) {
    return this.svc.listReservations({
      branchId: branchId ? parseInt(branchId, 10) : undefined,
      status,
      date,
    });
  }

  @Post('reservations') @Roles(...MANAGE)
  createReservation(@Body() dto: CreateReservationDto, @CurrentUser('id') userId: number) {
    return this.svc.createReservation(dto, userId);
  }

  @Patch('reservations/:id/status') @Roles(...MANAGE)
  setStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: SetReservationStatusDto) {
    return this.svc.setReservationStatus(id, dto.status);
  }
}

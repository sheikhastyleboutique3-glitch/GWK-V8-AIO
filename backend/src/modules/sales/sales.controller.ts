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
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrderChannel, OrderStatus, PaymentMethod, Role } from '@prisma/client';
import { Transform } from 'class-transformer';

export class OrderItemDto {
  @IsInt() productId: number;
  @IsNumber() @Min(0.0001) quantity: number;
  @IsNumber() @Min(0) unitPrice: number;
  @IsOptional() @IsNumber() discount?: number;
  @IsOptional() @IsNumber() taxAmount?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @Transform(({ obj }) => obj.modifiers, { toClassOnly: true }) modifiers?: any;
}

export class CreateOrderDto {
  @IsInt() branchId: number;
  @IsOptional() @IsEnum(OrderChannel) channel?: OrderChannel;
  @IsOptional() @IsInt() customerId?: number;
  @IsOptional() @IsString() tableName?: string;
  @IsOptional() @IsNumber() serviceCharge?: number;
  @IsOptional() @IsNumber() tip?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() couponCode?: string;
  @IsOptional() @IsInt() deliveryPlatformId?: number;
  @IsOptional() @IsString() platformRef?: string;
  @IsOptional() @IsInt() presetId?: number;
  @IsOptional() @IsInt() guestCount?: number;
  @IsOptional() @IsInt() pricelistId?: number;
  @IsOptional() @IsArray() combos?: { comboId: number; choiceIds: number[] }[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto)
  items?: OrderItemDto[];
}

export class AddPaymentDto {
  @IsEnum(PaymentMethod) method: PaymentMethod;
  @IsNumber() @Min(0.0001) amount: number;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() giftCardCode?: string;
}

export class CompleteOrderDto {
  @IsOptional() allowUnpaid?: boolean;
}

export class ApplyCouponDto {
  @IsOptional() @IsString() code?: string;
}

export class ApplyDiscountRuleDto {
  @IsOptional() @IsInt() ruleId?: number;
  @IsOptional() @IsString() reason?: string;
}

export class CorrectPaymentDto {
  @IsEnum(PaymentMethod) newMethod: PaymentMethod;
  @IsString() reason: string;
}

export class TransferTableDto {
  @IsString() tableName: string;
}
export class MergeOrderDto {
  @IsInt() fromOrderId: number;
}
export class SplitOrderDto {
  @IsArray() @IsInt({ each: true }) itemIds: number[];
}

const POS_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.BRANCH_MANAGER,
  Role.CASHIER,
  Role.WAITER,
];

@ApiTags('Sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales/orders')
export class SalesController {
  constructor(private svc: SalesService, private audit: AuditService) {}

  @Get()
  findAll(
    @Query('branchId') branchId?: string,
    @Query('status') status?: OrderStatus,
    @Query('customerId') customerId?: string,
  ) {
    return this.svc.findAll({
      branchId: branchId ? parseInt(branchId, 10) : undefined,
      status,
      customerId: customerId ? parseInt(customerId, 10) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id);
  }

  @Post() @Roles(...POS_ROLES)
  create(@Body() dto: CreateOrderDto, @CurrentUser('id') userId: number) {
    return this.svc.create(dto, userId);
  }

  @Post(':id/items') @Roles(...POS_ROLES)
  addItem(@Param('id', ParseIntPipe) id: number, @Body() dto: OrderItemDto) {
    return this.svc.addItem(id, dto);
  }

  @Delete(':id/items/:itemId') @Roles(...POS_ROLES)
  removeItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.svc.removeItem(id, itemId);
  }

  @Patch(':id/items/:itemId') @Roles(...POS_ROLES)
  updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: { notes?: string; isVoided?: boolean; voidReason?: string; seat?: number },
    @CurrentUser('id') userId: number,
  ) {
    return this.svc.updateItem(id, itemId, dto, userId);
  }

  @Patch(':id/hold') @Roles(...POS_ROLES)
  hold(@Param('id', ParseIntPipe) id: number) {
    return this.svc.setStatus(id, OrderStatus.HELD);
  }

  @Patch(':id') @Roles(...POS_ROLES)
  updateOrder(@Param('id', ParseIntPipe) id: number, @Body() dto: { notes?: string; guestCount?: number; tableName?: string }) {
    return this.svc.updateOrder(id, dto);
  }

  @Patch(':id/resume') @Roles(...POS_ROLES)
  resume(@Param('id', ParseIntPipe) id: number) {
    return this.svc.setStatus(id, OrderStatus.OPEN);
  }

  @Patch(':id/coupon') @Roles(...POS_ROLES)
  applyCoupon(@Param('id', ParseIntPipe) id: number, @Body() dto: ApplyCouponDto) {
    return this.svc.applyCoupon(id, dto.code ?? null);
  }

  @Patch(':id/discount') @Roles(...POS_ROLES)
  applyDiscountRule(@Param('id', ParseIntPipe) id: number, @Body() dto: ApplyDiscountRuleDto) {
    return this.svc.applyDiscountRule(id, dto.ruleId ?? null, dto.reason);
  }

  @Get(':id/courses') @Roles(...POS_ROLES)
  listCourses(@Param('id', ParseIntPipe) id: number) {
    return this.svc.listCourses(id);
  }

  @Post(':id/courses/:courseNo/fire') @Roles(...POS_ROLES)
  fireCourse(@Param('id', ParseIntPipe) id: number, @Param('courseNo', ParseIntPipe) courseNo: number) {
    return this.svc.fireCourse(id, courseNo);
  }

  @Patch(':id/table') @Roles(...POS_ROLES)
  transferTable(@Param('id', ParseIntPipe) id: number, @Body() dto: TransferTableDto) {
    return this.svc.transferTable(id, dto.tableName);
  }

  @Post(':id/merge') @Roles(...POS_ROLES)
  merge(@Param('id', ParseIntPipe) id: number, @Body() dto: MergeOrderDto) {
    return this.svc.merge(id, dto.fromOrderId);
  }

  @Post(':id/split') @Roles(...POS_ROLES)
  split(@Param('id', ParseIntPipe) id: number, @Body() dto: SplitOrderDto) {
    return this.svc.split(id, dto.itemIds);
  }

  @Post(':id/split-by-seat') @Roles(...POS_ROLES)
  splitBySeat(@Param('id', ParseIntPipe) id: number) {
    return this.svc.splitBySeat(id);
  }

  @Patch(':id/items/:itemId/seat') @Roles(...POS_ROLES)
  setItemSeat(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: { seat: number | null },
  ) {
    return this.svc.setItemSeat(id, itemId, dto?.seat ?? null);
  }

  @Patch(':id/void') @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  voidOrder(@Param('id', ParseIntPipe) id: number) {
    return this.svc.voidOrder(id);
  }

  @Post(':id/refund') @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  refund(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.svc.refund(id, userId);
  }

  @Patch(':id/payments/:paymentId/correct') @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  async correctPaymentMethod(
    @Param('id', ParseIntPipe) id: number,
    @Param('paymentId', ParseIntPipe) paymentId: number,
    @Body() dto: CorrectPaymentDto,
    @CurrentUser('id') userId: number,
  ) {
    const result = await this.svc.correctPaymentMethod(id, paymentId, dto.newMethod, dto.reason, userId);
    // Audit trail
    await this.audit.create({
      userId,
      action: 'PAYMENT_METHOD_CORRECTION',
      entity: 'Payment',
      entityId: String(paymentId),
      oldValues: { method: result.correction.oldMethod, amount: result.correction.amount },
      newValues: { method: result.correction.newMethod, amount: result.correction.amount, reason: dto.reason },
    });
    return result;
  }

  @Post(':id/payments') @Roles(...POS_ROLES)
  addPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddPaymentDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.svc.addPayment(id, dto, userId);
  }

  @Post(':id/complete') @Roles(...POS_ROLES)
  complete(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CompleteOrderDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.svc.complete(id, { allowUnpaid: !!dto?.allowUnpaid }, userId);
  }
}

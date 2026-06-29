import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentMethodsService } from './payment-methods.service';
import { OnlinePaymentService } from './online-payment.service';
import { CreatePaymentMethodDto, UpdatePaymentMethodDto } from './payment-methods.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '@prisma/client';

@ApiTags('Payment Methods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payment-methods')
export class PaymentMethodsController {
  constructor(private svc: PaymentMethodsService, private onlinePay: OnlinePaymentService) {}

  @Get() findAll(@Query('activeOnly') activeOnly?: string) { return this.svc.findAll(activeOnly === 'true'); }

  @Post() @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  create(@Body() dto: CreatePaymentMethodDto) { return this.svc.create(dto); }

  @Patch(':id') @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePaymentMethodDto) { return this.svc.update(id, dto); }

  @Delete(':id') @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  remove(@Param('id', ParseIntPipe) id: number) { return this.svc.remove(id); }

  @Public()
  @Post('intents')
  createIntent(@Body() dto: { amount: number; currency?: string; orderId?: number; provider?: string; description?: string }) {
    return this.onlinePay.createIntent(dto);
  }

  @Public()
  @Get('intents/:intentId/verify')
  verifyIntent(@Param('intentId') intentId: string) {
    return this.onlinePay.verifyIntent(intentId);
  }
}

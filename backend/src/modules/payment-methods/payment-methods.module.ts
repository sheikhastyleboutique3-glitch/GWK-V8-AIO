import { Module } from '@nestjs/common';
import { PaymentMethodsService } from './payment-methods.service';
import { PaymentMethodsController } from './payment-methods.controller';
import { OnlinePaymentService } from './online-payment.service';

@Module({
  controllers: [PaymentMethodsController],
  providers: [PaymentMethodsService, OnlinePaymentService],
  exports: [PaymentMethodsService, OnlinePaymentService],
})
export class PaymentMethodsModule {}

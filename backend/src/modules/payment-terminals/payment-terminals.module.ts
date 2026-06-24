import { Module } from '@nestjs/common';
import { PaymentTerminalsService } from './payment-terminals.service';
import { PaymentTerminalsController } from './payment-terminals.controller';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [SalesModule],
  controllers: [PaymentTerminalsController],
  providers: [PaymentTerminalsService],
  exports: [PaymentTerminalsService],
})
export class PaymentTerminalsModule {}

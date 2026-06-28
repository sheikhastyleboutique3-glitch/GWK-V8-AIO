import { Module } from '@nestjs/common';
import { PaymentTerminalsService } from './payment-terminals.service';
import { PaymentTerminalsController } from './payment-terminals.controller';
import { TerminalSdkService } from './terminal-sdk.service';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [SalesModule],
  controllers: [PaymentTerminalsController],
  providers: [PaymentTerminalsService, TerminalSdkService],
  exports: [PaymentTerminalsService, TerminalSdkService],
})
export class PaymentTerminalsModule {}

import { Module } from '@nestjs/common';
import { PaymentTerminalsService } from './payment-terminals.service';
import { PaymentTerminalsController } from './payment-terminals.controller';

@Module({ controllers: [PaymentTerminalsController], providers: [PaymentTerminalsService], exports: [PaymentTerminalsService] })
export class PaymentTerminalsModule {}

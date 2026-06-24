import { Module } from '@nestjs/common';
import { CashRoundingsService } from './cash-roundings.service';
import { CashRoundingsController } from './cash-roundings.controller';

@Module({ controllers: [CashRoundingsController], providers: [CashRoundingsService], exports: [CashRoundingsService] })
export class CashRoundingsModule {}

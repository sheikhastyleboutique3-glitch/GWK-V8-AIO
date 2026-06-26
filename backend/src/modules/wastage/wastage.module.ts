import { Module } from '@nestjs/common';
import { WastageService } from './wastage.service';
import { WastageController } from './wastage.controller';
import { InventoryModule } from '../inventory/inventory.module';
import { AuditModule } from '../audit/audit.module';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [InventoryModule, AuditModule, FinanceModule],
  controllers: [WastageController],
  providers: [WastageService],
})
export class WastageModule {}

import { Module } from '@nestjs/common';
import { StockCountsService } from './stock-counts.service';
import { StockCountsController } from './stock-counts.controller';
import { InventoryModule } from '../inventory/inventory.module';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [InventoryModule, FinanceModule],
  controllers: [StockCountsController],
  providers: [StockCountsService],
  exports: [StockCountsService],
})
export class StockCountsModule {}

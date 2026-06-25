import { Module } from '@nestjs/common';
import { PosSessionsService } from './pos-sessions.service';
import { PosSessionsController } from './pos-sessions.controller';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [FinanceModule],
  controllers: [PosSessionsController],
  providers: [PosSessionsService],
  exports: [PosSessionsService],
})
export class PosSessionsModule {}

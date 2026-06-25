import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { EodEmailService } from './eod-email.service';
import { PosSessionsModule } from '../pos-sessions/pos-sessions.module';

@Module({
  imports: [PosSessionsModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, EodEmailService],
  exports: [AnalyticsService, EodEmailService],
})
export class AnalyticsModule {}

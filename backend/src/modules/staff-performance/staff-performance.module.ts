import { Module } from '@nestjs/common';
import { StaffPerformanceService } from './staff-performance.service';
import { StaffPerformanceController } from './staff-performance.controller';

@Module({
  controllers: [StaffPerformanceController],
  providers: [StaffPerformanceService],
  exports: [StaffPerformanceService],
})
export class StaffPerformanceModule {}

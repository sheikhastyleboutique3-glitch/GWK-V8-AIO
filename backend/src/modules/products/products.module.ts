import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { MenuSchedulerService } from './menu-scheduler.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [ProductsController],
  providers: [ProductsService, MenuSchedulerService],
  exports: [ProductsService],
})
export class ProductsModule {}

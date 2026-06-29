import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { MenuSchedulerService } from './menu-scheduler.service';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [ProductsController],
  providers: [ProductsService, MenuSchedulerService],
  exports: [ProductsService],
})
export class ProductsModule {}

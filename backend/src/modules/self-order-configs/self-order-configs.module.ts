import { Module } from '@nestjs/common';
import { SelfOrderConfigsService } from './self-order-configs.service';
import { SelfOrderConfigsController } from './self-order-configs.controller';
import { SelfOrderPublicController } from './self-order.public.controller';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [SalesModule],
  controllers: [SelfOrderConfigsController, SelfOrderPublicController],
  providers: [SelfOrderConfigsService],
  exports: [SelfOrderConfigsService],
})
export class SelfOrderConfigsModule {}

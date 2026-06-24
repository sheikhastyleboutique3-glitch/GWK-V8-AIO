import { Module } from '@nestjs/common';
import { SelfOrderConfigsService } from './self-order-configs.service';
import { SelfOrderConfigsController } from './self-order-configs.controller';

@Module({ controllers: [SelfOrderConfigsController], providers: [SelfOrderConfigsService], exports: [SelfOrderConfigsService] })
export class SelfOrderConfigsModule {}

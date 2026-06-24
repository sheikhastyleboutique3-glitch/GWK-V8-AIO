import { Module } from '@nestjs/common';
import { OrderPresetsService } from './order-presets.service';
import { OrderPresetsController } from './order-presets.controller';

@Module({ controllers: [OrderPresetsController], providers: [OrderPresetsService], exports: [OrderPresetsService] })
export class OrderPresetsModule {}

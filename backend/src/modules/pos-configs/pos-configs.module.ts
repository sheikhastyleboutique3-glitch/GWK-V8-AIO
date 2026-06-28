import { Module } from '@nestjs/common';
import { PosConfigsService } from './pos-configs.service';
import { PosConfigsController } from './pos-configs.controller';

@Module({
  controllers: [PosConfigsController],
  providers: [PosConfigsService],
  exports: [PosConfigsService],
})
export class PosConfigsModule {}

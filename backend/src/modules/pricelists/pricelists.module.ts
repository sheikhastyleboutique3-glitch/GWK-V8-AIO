import { Module } from '@nestjs/common';
import { PricelistsService } from './pricelists.service';
import { PricelistsController } from './pricelists.controller';

@Module({ controllers: [PricelistsController], providers: [PricelistsService], exports: [PricelistsService] })
export class PricelistsModule {}

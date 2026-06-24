import { Module } from '@nestjs/common';
import { FiscalPositionsService } from './fiscal-positions.service';
import { FiscalPositionsController } from './fiscal-positions.controller';

@Module({ controllers: [FiscalPositionsController], providers: [FiscalPositionsService], exports: [FiscalPositionsService] })
export class FiscalPositionsModule {}

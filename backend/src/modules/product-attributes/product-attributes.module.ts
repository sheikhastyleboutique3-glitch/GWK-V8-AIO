import { Module } from '@nestjs/common';
import { ProductAttributesService } from './product-attributes.service';
import { ProductAttributesController } from './product-attributes.controller';

@Module({ controllers: [ProductAttributesController], providers: [ProductAttributesService], exports: [ProductAttributesService] })
export class ProductAttributesModule {}

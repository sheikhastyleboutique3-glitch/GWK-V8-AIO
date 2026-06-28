import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsInt,
  IsEnum,
  IsArray,
  Min,
} from 'class-validator';
import { ProductType } from '@prisma/client';

export class CreateProductDto {
  @IsString() name: string;
  @IsOptional() @IsString() nameAr?: string;
  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() descriptionAr?: string;
  @IsOptional() @IsInt() categoryId?: number;
  @IsOptional() @IsInt() unitId?: number;
  @IsOptional() @IsInt() supplierId?: number;
  @IsNumber() @Min(0) salePrice: number;
  @IsOptional() @IsNumber() @Min(0) costPrice?: number;
  @IsOptional() @IsNumber() @Min(0) minStockLevel?: number;
  @IsOptional() @IsNumber() @Min(0) reorderPoint?: number;
  @IsOptional() @IsBoolean() isSellable?: boolean;
  @IsOptional() @IsBoolean() isAvailable?: boolean;
  @IsOptional() @IsEnum(ProductType) productType?: ProductType;
  @IsOptional() @IsString() barcode?: string;
  @IsOptional() @IsBoolean() weighed?: boolean;
  @IsOptional() @IsBoolean() tracksExpiry?: boolean;
  @IsOptional() @IsBoolean() allowNegativeStock?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) allergens?: string[];
  @IsOptional() @IsString() allergenNotes?: string;
  @IsOptional() @IsString() taxCategory?: string;
  // Menu scheduling
  @IsOptional() @IsBoolean() scheduleEnabled?: boolean;
  @IsOptional() @IsString() scheduleStart?: string;
  @IsOptional() @IsString() scheduleEnd?: string;
  @IsOptional() @IsArray() @IsInt({ each: true }) scheduleDays?: number[];
}

export class UpdateProductDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() nameAr?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() descriptionAr?: string;
  @IsOptional() @IsInt() categoryId?: number;
  @IsOptional() @IsInt() unitId?: number;
  @IsOptional() @IsInt() supplierId?: number;
  @IsOptional() @IsNumber() @Min(0) salePrice?: number;
  @IsOptional() @IsNumber() @Min(0) costPrice?: number;
  @IsOptional() @IsNumber() @Min(0) minStockLevel?: number;
  @IsOptional() @IsNumber() @Min(0) reorderPoint?: number;
  @IsOptional() @IsBoolean() isSellable?: boolean;
  @IsOptional() @IsBoolean() isAvailable?: boolean;
  @IsOptional() @IsEnum(ProductType) productType?: ProductType;
  @IsOptional() @IsString() barcode?: string;
  @IsOptional() @IsBoolean() weighed?: boolean;
  @IsOptional() @IsBoolean() tracksExpiry?: boolean;
  @IsOptional() @IsBoolean() allowNegativeStock?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) allergens?: string[];
  @IsOptional() @IsString() allergenNotes?: string;
  @IsOptional() @IsString() taxCategory?: string;
  // Menu scheduling
  @IsOptional() @IsBoolean() scheduleEnabled?: boolean;
  @IsOptional() @IsString() scheduleStart?: string;
  @IsOptional() @IsString() scheduleEnd?: string;
  @IsOptional() @IsArray() @IsInt({ each: true }) scheduleDays?: number[];
}

export class SetAvailabilityDto {
  @IsBoolean() isAvailable: boolean;
}

import { IsString, IsOptional, IsInt, IsBoolean, IsNumber, IsArray } from 'class-validator';

export class CreateProductAttributeDto {
  @IsString() name: string;
  @IsOptional() @IsString() nameAr?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() values?: { name: string; nameAr?: string; sortOrder?: number }[];
}

export class UpdateProductAttributeDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() nameAr?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() values?: { name: string; nameAr?: string; sortOrder?: number }[];
}

export class CreateProductVariantDto {
  @IsInt() productId: number;
  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsNumber() priceExtra?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

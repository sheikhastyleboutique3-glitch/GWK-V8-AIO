import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class CreatePricelistDto {
  @IsString() name: string;
  @IsOptional() @IsString() nameAr?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() items?: any[];
}

export class UpdatePricelistDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() nameAr?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() items?: any[];
}

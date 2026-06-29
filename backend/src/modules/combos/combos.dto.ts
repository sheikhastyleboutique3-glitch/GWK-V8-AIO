import { IsString, IsOptional, IsNumber, IsBoolean, IsArray } from 'class-validator';

export class CreateComboDto {
  @IsString() name: string;
  @IsOptional() @IsString() nameAr?: string;
  @IsNumber() basePrice: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() lines?: any[];
}

export class UpdateComboDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() nameAr?: string;
  @IsOptional() @IsNumber() basePrice?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() lines?: any[];
}

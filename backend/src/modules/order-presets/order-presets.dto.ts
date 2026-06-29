import { IsString, IsOptional, IsInt, IsBoolean, IsEnum } from 'class-validator';

export class CreateOrderPresetDto {
  @IsString() name: string;
  @IsOptional() @IsString() nameAr?: string;
  @IsString() channel: string;
  @IsOptional() @IsInt() fiscalPositionId?: number;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateOrderPresetDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() nameAr?: string;
  @IsOptional() @IsString() channel?: string;
  @IsOptional() @IsInt() fiscalPositionId?: number;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

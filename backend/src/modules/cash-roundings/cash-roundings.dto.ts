import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum } from 'class-validator';

export class CreateCashRoundingDto {
  @IsString() name: string;
  @IsNumber() rounding: number;
  @IsOptional() @IsEnum(['UP', 'DOWN', 'HALF_UP']) strategy?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateCashRoundingDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsNumber() rounding?: number;
  @IsOptional() @IsEnum(['UP', 'DOWN', 'HALF_UP']) strategy?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

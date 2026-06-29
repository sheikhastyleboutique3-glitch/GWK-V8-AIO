import { IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';

export class CreatePaymentMethodDto {
  @IsString() name: string;
  @IsOptional() @IsString() nameAr?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() icon?: string;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() allowOnPos?: boolean;
  @IsOptional() @IsBoolean() allowOnKiosk?: boolean;
}

export class UpdatePaymentMethodDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() nameAr?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() icon?: string;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() allowOnPos?: boolean;
  @IsOptional() @IsBoolean() allowOnKiosk?: boolean;
}

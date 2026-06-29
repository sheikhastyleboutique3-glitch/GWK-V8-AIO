import { IsString, IsOptional, IsInt, IsBoolean, IsEnum } from 'class-validator';

export class CreateIotDeviceDto {
  @IsString() name: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() ipAddress?: string;
  @IsOptional() @IsInt() branchId?: number;
  @IsOptional() @IsString() serialNumber?: string;
  @IsOptional() @IsString() manufacturer?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateIotDeviceDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() ipAddress?: string;
  @IsOptional() @IsInt() branchId?: number;
  @IsOptional() @IsString() serialNumber?: string;
  @IsOptional() @IsString() manufacturer?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

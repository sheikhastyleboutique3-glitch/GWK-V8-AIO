import { IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';

export class CreatePaymentTerminalDto {
  @IsString() name: string;
  @IsOptional() @IsString() provider?: string;
  @IsOptional() @IsString() serialNumber?: string;
  @IsOptional() @IsString() ipAddress?: string;
  @IsOptional() @IsInt() branchId?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdatePaymentTerminalDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() provider?: string;
  @IsOptional() @IsString() serialNumber?: string;
  @IsOptional() @IsString() ipAddress?: string;
  @IsOptional() @IsInt() branchId?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

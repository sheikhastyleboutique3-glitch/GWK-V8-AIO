import { IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';

export class CreateSelfOrderConfigDto {
  @IsString() name: string;
  @IsInt() branchId: number;
  @IsOptional() @IsString() mode?: string;
  @IsOptional() @IsString() welcomeMessage?: string;
  @IsOptional() @IsString() primaryColor?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() requireTable?: boolean;
}

export class UpdateSelfOrderConfigDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsInt() branchId?: number;
  @IsOptional() @IsString() mode?: string;
  @IsOptional() @IsString() welcomeMessage?: string;
  @IsOptional() @IsString() primaryColor?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() requireTable?: boolean;
}

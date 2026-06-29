import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class CreateFiscalPositionDto {
  @IsString() name: string;
  @IsOptional() @IsString() nameAr?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() taxMaps?: any[];
}

export class UpdateFiscalPositionDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() nameAr?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() taxMaps?: any[];
}

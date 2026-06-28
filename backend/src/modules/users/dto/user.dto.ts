import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsEnum,
  IsEmail,
  MinLength,
  IsArray,
} from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
  @IsString() firstName: string;
  @IsString() lastName: string;
  @IsOptional() @IsString() firstNameAr?: string;
  @IsOptional() @IsString() lastNameAr?: string;
  @IsEnum(Role) role: Role;
  @IsOptional() @IsInt() branchId?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isApproved?: boolean;
  @IsOptional() @IsString() posPin?: string;
  @IsOptional() @IsArray() @IsInt({ each: true }) branchIds?: number[];
}

export class UpdateUserDto {
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MinLength(6) password?: string;
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() firstNameAr?: string;
  @IsOptional() @IsString() lastNameAr?: string;
  @IsOptional() @IsEnum(Role) role?: Role;
  @IsOptional() @IsInt() branchId?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isApproved?: boolean;
  @IsOptional() @IsString() posPin?: string;
  @IsOptional() @IsArray() @IsInt({ each: true }) branchIds?: number[];
}

export class UpdatePreferencesDto {
  @IsOptional() theme?: any;
  @IsOptional() @IsString() language?: string;
}

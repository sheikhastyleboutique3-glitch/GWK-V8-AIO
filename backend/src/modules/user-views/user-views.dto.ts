import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateUserViewDto {
  @IsString() pageId: string;
  @IsString() name: string;
  @IsOptional() @IsString() filters?: string;
  @IsOptional() @IsString() groupBy?: string;
  @IsOptional() @IsString() sortBy?: string;
  @IsOptional() @IsString() columns?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class UpdateUserViewDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() filters?: string;
  @IsOptional() @IsString() groupBy?: string;
  @IsOptional() @IsString() sortBy?: string;
  @IsOptional() @IsString() columns?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

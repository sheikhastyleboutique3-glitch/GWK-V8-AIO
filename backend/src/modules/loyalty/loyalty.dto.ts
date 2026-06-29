import { IsString, IsOptional, IsInt, IsNumber, IsBoolean } from 'class-validator';

export class CreateLoyaltyProgramDto {
  @IsString() name: string;
  @IsOptional() @IsString() nameAr?: string;
  @IsOptional() @IsNumber() pointsPerUnit?: number;
  @IsOptional() @IsNumber() pointValue?: number;
  @IsOptional() @IsNumber() minRedeemPoints?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateLoyaltyProgramDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() nameAr?: string;
  @IsOptional() @IsNumber() pointsPerUnit?: number;
  @IsOptional() @IsNumber() pointValue?: number;
  @IsOptional() @IsNumber() minRedeemPoints?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class IssueCardDto {
  @IsInt() programId: number;
  @IsOptional() @IsInt() customerId?: number;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsNumber() initialBalance?: number;
}

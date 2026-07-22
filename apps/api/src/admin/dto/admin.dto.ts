import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { DELIVERY_TYPES } from "@7mz/shared";

export class CreateProductDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() categoryId!: string;
  @ApiProperty() @IsString() shortDescription!: string;
  @ApiProperty() @IsString() description!: string;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) price!: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) compareAtPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() thumbnail?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() images?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() features?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() tags?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() brandColor?: string;
  @ApiPropertyOptional({ enum: DELIVERY_TYPES }) @IsOptional() @IsIn(DELIVERY_TYPES) deliveryType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryNote?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFlashSale?: boolean;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class AddStockDto {
  @ApiProperty({ type: [String], description: "One code/credential per line item" })
  @IsArray()
  items!: string[];
}

export class CreateCategoryDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() icon?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() accentColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() parentId?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isVisible?: boolean;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

export class CreateCouponDto {
  @ApiProperty() @IsString() code!: string;
  @ApiProperty({ enum: ["PERCENTAGE", "FIXED"] }) @IsIn(["PERCENTAGE", "FIXED"]) type!: string;
  @ApiProperty() @Type(() => Number) @IsNumber() value!: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() minOrderAmount?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() maxDiscount?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() usageLimit?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() perUserLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() expiresAt?: string;
}

export class CreateBannerDto {
  @ApiProperty() @IsString() title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subtitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() eyebrow?: string;
  @ApiProperty() @IsString() image!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ctaLabel?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ctaUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() accentColor?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateBannerDto extends PartialType(CreateBannerDto) {}

export class AdjustBalanceDto {
  @ApiProperty() @Type(() => Number) @IsNumber() amount!: number; // signed
  @ApiProperty() @IsString() reason!: string;
}

export class UpdateUserRoleDto {
  @ApiProperty({ enum: ["CUSTOMER", "SUPPORT", "MANAGER", "ADMIN", "SUPER_ADMIN"] })
  @IsIn(["CUSTOMER", "SUPPORT", "MANAGER", "ADMIN", "SUPER_ADMIN"])
  role!: string;
}

export class UpdateGatewayDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isTestMode?: boolean;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() feePercent?: number;
}

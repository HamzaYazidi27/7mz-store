import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { PRODUCT_SORT_OPTIONS, type ProductSort } from "@7mz/shared";

const toBool = ({ value }: { value: unknown }) =>
  value === true || value === "true" || value === "1" || value === 1;

export class ProductQueryDto {
  @ApiPropertyOptional({ description: "Free-text search over name, description, and tags" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ description: "Category slug" })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: "Category id (alternative to slug)" })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ enum: PRODUCT_SORT_OPTIONS, default: "popular" })
  @IsOptional()
  @IsIn(PRODUCT_SORT_OPTIONS)
  sort: ProductSort = "popular";

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: "Only items currently in stock" })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  inStock?: boolean;

  @ApiPropertyOptional({ description: "Only discounted / flash-sale items" })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  onSale?: boolean;

  @ApiPropertyOptional({ description: "Cursor (id of the last item from the previous page)" })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;
}

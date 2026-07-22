import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsNumber, IsOptional, IsString, Matches, Max, Min } from "class-validator";
import { PAYMENT_PROVIDERS } from "@7mz/shared";

const DEPOSIT_PROVIDERS = PAYMENT_PROVIDERS.filter((p) => p !== "balance");

export class DepositDto {
  @ApiProperty({ minimum: 1, maximum: 10000 })
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: "Minimum deposit is $1" })
  @Max(10000, { message: "Maximum deposit is $10,000" })
  amount!: number;

  @ApiProperty({ enum: DEPOSIT_PROVIDERS })
  @IsIn(DEPOSIT_PROVIDERS)
  provider!: string;

  @ApiProperty({ required: false, enum: ["USDT", "BTC", "LTC"] })
  @IsOptional()
  @IsIn(["USDT", "BTC", "LTC"])
  asset?: string;
}

export class WithdrawDto {
  @ApiProperty({ minimum: 5 })
  @Type(() => Number)
  @IsNumber()
  @Min(5, { message: "Minimum withdrawal is $5" })
  amount!: number;

  @ApiProperty()
  @IsString()
  method!: string;

  @ApiProperty()
  @IsString()
  destination!: string;
}

export class PromoCodeDto {
  @ApiProperty()
  @Matches(/^[A-Za-z0-9_-]{2,32}$/, { message: "Invalid promo code format" })
  code!: string;
}

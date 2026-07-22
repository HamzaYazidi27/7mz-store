import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class TelegramAuthDto {
  @ApiProperty({ description: "Raw initData query string from Telegram.WebApp.initData" })
  @IsString()
  @IsNotEmpty()
  initData!: string;

  @ApiPropertyOptional({ description: "start_param from the Mini App deep link (referral code)" })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  startParam?: string;

  @ApiPropertyOptional({ description: "Telegram platform: ios / android / tdesktop / macos / weba" })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  platform?: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: "The refresh token issued at login" })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

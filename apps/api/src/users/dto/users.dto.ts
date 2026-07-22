import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateIf,
} from "class-validator";

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: "Email address; empty string clears it" })
  @IsOptional()
  @ValidateIf((_, value) => value !== "")
  @IsEmail({}, { message: "Enter a valid email address" })
  email?: string;

  @ApiPropertyOptional({ enum: ["dark", "light", "system"] })
  @IsOptional()
  @IsIn(["dark", "light", "system"])
  theme?: "dark" | "light" | "system";

  @ApiPropertyOptional({ example: "en" })
  @IsOptional()
  @IsString()
  @Length(2, 8)
  languageCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;
}

export class TwoFactorCodeDto {
  @ApiProperty({ description: "6-digit TOTP code", example: "123456" })
  @Matches(/^\d{6}$/, { message: "Enter the 6-digit code from your authenticator app" })
  code!: string;
}

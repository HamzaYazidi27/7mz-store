import { Body, Controller, HttpCode, HttpStatus, Post, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { AuthService } from "./auth.service";
import { RefreshTokenDto, TelegramAuthDto } from "./dto/auth.dto";
import type { AuthUser } from "./types";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("telegram")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Sign in with Telegram WebApp initData" })
  loginWithTelegram(@Body() dto: TelegramAuthDto, @Req() req: Request) {
    return this.auth.loginWithTelegram(dto, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
  }

  @Public()
  @Post("admin/telegram-login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Admin panel login via Telegram Login Widget (staff only)" })
  loginAdmin(@Body() body: Record<string, unknown>, @Req() req: Request) {
    return this.auth.loginAdmin(body as never, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: "Rotate the refresh token and get a new token pair" })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Revoke the current session" })
  async logout(@CurrentUser() user: AuthUser) {
    await this.auth.logout(user);
  }
}

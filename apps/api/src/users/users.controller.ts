import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../auth/types";
import { TwoFactorCodeDto, UpdateProfileDto } from "./dto/users.dto";
import { UsersService } from "./users.service";

@ApiTags("Users")
@ApiBearerAuth("access-token")
@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get("me")
  @ApiOperation({ summary: "Current user profile" })
  me(@CurrentUser() user: AuthUser) {
    return this.users.me(user.id);
  }

  @Patch("me")
  @ApiOperation({ summary: "Update profile (email, theme, language, notifications)" })
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.id, dto);
  }

  @Get("me/stats")
  @ApiOperation({ summary: "Lifetime account statistics" })
  stats(@CurrentUser() user: AuthUser) {
    return this.users.stats(user.id);
  }

  // ------------------------------------------------------------- sessions

  @Get("me/sessions")
  @ApiOperation({ summary: "Active sessions (device management)" })
  sessions(@CurrentUser() user: AuthUser) {
    return this.users.sessions(user);
  }

  @Delete("me/sessions/others")
  @ApiOperation({ summary: "Log out every other device" })
  revokeOthers(@CurrentUser() user: AuthUser) {
    return this.users.revokeOtherSessions(user);
  }

  @Delete("me/sessions/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Revoke a specific session" })
  async revokeSession(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    await this.users.revokeSession(user, id);
  }

  @Get("me/login-history")
  @ApiOperation({ summary: "Recent login history" })
  loginHistory(@CurrentUser() user: AuthUser, @Query("limit") limit?: number) {
    return this.users.loginHistory(user.id, limit ?? 20);
  }

  // ------------------------------------------------------------------ 2FA

  @Post("me/2fa/setup")
  @ApiOperation({ summary: "Begin 2FA enrollment — returns secret + QR" })
  setup2fa(@CurrentUser() user: AuthUser) {
    return this.users.setupTwoFactor(user.id);
  }

  @Post("me/2fa/enable")
  @ApiOperation({ summary: "Confirm 2FA enrollment with a TOTP code" })
  enable2fa(@CurrentUser() user: AuthUser, @Body() dto: TwoFactorCodeDto) {
    return this.users.enableTwoFactor(user.id, dto.code);
  }

  @Post("me/2fa/disable")
  @ApiOperation({ summary: "Disable 2FA (requires a valid TOTP code)" })
  disable2fa(@CurrentUser() user: AuthUser, @Body() dto: TwoFactorCodeDto) {
    return this.users.disableTwoFactor(user.id, dto.code);
  }
}

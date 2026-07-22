import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../auth/types";
import { ReferralsService } from "./referrals.service";

@ApiTags("Referrals")
@ApiBearerAuth("access-token")
@Controller("referrals")
export class ReferralsController {
  constructor(private readonly referrals: ReferralsService) {}

  @Get("stats")
  @ApiOperation({ summary: "Referral dashboard: code, invite link, earnings" })
  stats(@CurrentUser() user: AuthUser) {
    return this.referrals.getStats(user.id);
  }

  @Get("leaderboard")
  @ApiOperation({ summary: "Top affiliates by earnings" })
  leaderboard(@CurrentUser() user: AuthUser, @Query("limit") limit?: string) {
    return this.referrals.leaderboard(user.id, limit ? Number.parseInt(limit, 10) : 20);
  }
}

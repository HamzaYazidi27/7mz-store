import { Controller, Get, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../auth/types";
import { RewardsService } from "./rewards.service";

@ApiTags("Rewards")
@ApiBearerAuth("access-token")
@Controller("rewards")
export class RewardsController {
  constructor(private readonly rewards: RewardsService) {}

  @Get("daily")
  @ApiOperation({ summary: "Daily reward state (streak, ladder, claimable)" })
  dailyState(@CurrentUser() user: AuthUser) {
    return this.rewards.dailyState(user.id);
  }

  @Post("daily/claim")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Claim today's daily reward" })
  claimDaily(@CurrentUser() user: AuthUser) {
    return this.rewards.claimDaily(user.id);
  }

  @Get("spin")
  @ApiOperation({ summary: "Prize wheel state and prizes" })
  spinState(@CurrentUser() user: AuthUser) {
    return this.rewards.spinState(user.id);
  }

  @Post("spin")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: "Spin the prize wheel" })
  spin(@CurrentUser() user: AuthUser) {
    return this.rewards.spin(user.id);
  }
}

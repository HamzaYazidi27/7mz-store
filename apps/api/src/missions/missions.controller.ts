import { Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../auth/types";
import { MissionsService } from "./missions.service";

@ApiTags("Missions")
@ApiBearerAuth("access-token")
@Controller("missions")
export class MissionsController {
  constructor(private readonly missions: MissionsService) {}

  @Get()
  @ApiOperation({ summary: "List missions with the user's progress" })
  list(@CurrentUser() user: AuthUser) {
    return this.missions.listForUser(user.id);
  }

  @Post(":id/claim")
  @ApiOperation({ summary: "Claim a completed mission's reward" })
  claim(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.missions.claim(user.id, id);
  }
}

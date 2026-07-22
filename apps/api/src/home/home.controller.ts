import { Controller, Get, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { Public } from "../common/decorators/public.decorator";
import type { AuthUser } from "../auth/types";
import { HomeService } from "./home.service";

@ApiTags("Home")
@Controller("home")
export class HomeController {
  constructor(private readonly home: HomeService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: "Aggregated home feed: banners, announcements, categories, product rails",
  })
  feed(@Req() req: Request & { user?: AuthUser }) {
    return this.home.feed(req.user?.id ?? null);
  }
}

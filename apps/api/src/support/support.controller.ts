import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../auth/types";
import { CreateTicketDto, ReplyTicketDto } from "./dto/support.dto";
import { SupportService } from "./support.service";

@ApiTags("Support")
@Controller()
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Public()
  @Get("help/articles")
  @ApiOperation({ summary: "Help center articles (searchable)" })
  help(@Query("q") q?: string) {
    return this.support.helpArticles(q);
  }

  @ApiBearerAuth("access-token")
  @Get("tickets")
  @ApiOperation({ summary: "List the user's support tickets" })
  list(@CurrentUser() user: AuthUser) {
    return this.support.listTickets(user.id);
  }

  @ApiBearerAuth("access-token")
  @Post("tickets")
  @ApiOperation({ summary: "Open a support ticket" })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTicketDto) {
    return this.support.createTicket(user.id, dto);
  }

  @ApiBearerAuth("access-token")
  @Get("tickets/:id")
  @ApiOperation({ summary: "Ticket detail with message thread" })
  detail(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.support.getTicket(user.id, id);
  }

  @ApiBearerAuth("access-token")
  @Post("tickets/:id/reply")
  @ApiOperation({ summary: "Reply to a ticket" })
  reply(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: ReplyTicketDto) {
    return this.support.reply(user.id, id, dto.body);
  }

  @ApiBearerAuth("access-token")
  @Post("tickets/:id/close")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Close a ticket" })
  async close(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    await this.support.closeTicket(user.id, id);
  }
}

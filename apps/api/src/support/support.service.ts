import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  CursorPaginated,
  HelpArticleDto,
  TicketDetailDto,
  TicketDto,
  TicketMessageDto,
} from "@7mz/shared";
import { CryptoService } from "../crypto/crypto.service";
import { PrismaService } from "../prisma/prisma.service";
import type { Ticket, TicketMessage } from "../generated/prisma/client";
import type { CreateTicketDto } from "./dto/support.dto";

/**
 * SupportService — customer tickets and the help center. Tickets are threaded
 * conversations between a customer and staff; the last-message timestamp drives
 * ordering and the unread indicator.
 */
@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  private toTicketDto(ticket: Ticket & { messages?: TicketMessage[] }): TicketDto {
    const unread = ticket.messages
      ? ticket.messages.filter((m) => m.isStaff).length // simplistic unread proxy
      : 0;
    return {
      id: ticket.id,
      number: ticket.number,
      subject: ticket.subject,
      status: ticket.status,
      lastMessageAt: ticket.lastMessageAt.toISOString(),
      createdAt: ticket.createdAt.toISOString(),
      unreadCount: unread,
    };
  }

  async createTicket(userId: string, dto: CreateTicketDto): Promise<TicketDetailDto> {
    const number = this.crypto.ticketNumber();
    const ticket = await this.prisma.ticket.create({
      data: {
        number,
        userId,
        subject: dto.subject,
        orderId: dto.orderId ?? null,
        status: "OPEN",
        messages: {
          create: { authorId: userId, isStaff: false, body: dto.message },
        },
      },
    });
    return this.getTicket(userId, ticket.id);
  }

  async listTickets(userId: string): Promise<TicketDto[]> {
    const rows = await this.prisma.ticket.findMany({
      where: { userId },
      orderBy: { lastMessageAt: "desc" },
    });
    return rows.map((t) => this.toTicketDto(t));
  }

  async getTicket(userId: string, ticketId: string): Promise<TicketDetailDto> {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, userId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          include: { author: { select: { firstName: true, lastName: true } } },
        },
      },
    });
    if (!ticket) throw new NotFoundException("Ticket not found");

    const messages: TicketMessageDto[] = ticket.messages.map((m) => ({
      id: m.id,
      body: m.body,
      isStaff: m.isStaff,
      authorName: m.isStaff
        ? "7MZ Support"
        : `${m.author.firstName}${m.author.lastName ? ` ${m.author.lastName}` : ""}`,
      attachments: m.attachments,
      createdAt: m.createdAt.toISOString(),
    }));

    return {
      ...this.toTicketDto(ticket),
      messages,
      orderNumber: null,
    };
  }

  async reply(userId: string, ticketId: string, body: string): Promise<TicketMessageDto> {
    const ticket = await this.prisma.ticket.findFirst({ where: { id: ticketId, userId } });
    if (!ticket) throw new NotFoundException("Ticket not found");
    if (ticket.status === "CLOSED") throw new ForbiddenException("This ticket is closed");

    const message = await this.prisma.ticketMessage.create({
      data: { ticketId, authorId: userId, isStaff: false, body },
      include: { author: { select: { firstName: true, lastName: true } } },
    });
    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { lastMessageAt: new Date(), status: "AWAITING_STAFF" },
    });

    return {
      id: message.id,
      body: message.body,
      isStaff: false,
      authorName: `${message.author.firstName}${message.author.lastName ? ` ${message.author.lastName}` : ""}`,
      attachments: message.attachments,
      createdAt: message.createdAt.toISOString(),
    };
  }

  async closeTicket(userId: string, ticketId: string): Promise<void> {
    const ticket = await this.prisma.ticket.findFirst({ where: { id: ticketId, userId } });
    if (!ticket) throw new NotFoundException("Ticket not found");
    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: "CLOSED", closedAt: new Date() },
    });
  }

  // ------------------------------------------------------------- help center

  async helpArticles(query?: string): Promise<HelpArticleDto[]> {
    const rows = await this.prisma.helpArticle.findMany({
      where: {
        isPublished: true,
        ...(query
          ? {
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { body: { contains: query, mode: "insensitive" } },
                { tags: { has: query.toLowerCase() } },
              ],
            }
          : {}),
      },
      orderBy: [{ sortOrder: "asc" }],
      include: { category: { select: { name: true } } },
      take: 50,
    });
    return rows.map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      body: a.body,
      categoryName: a.category?.name ?? null,
      tags: a.tags,
    }));
  }
}

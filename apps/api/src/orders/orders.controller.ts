import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ORDER_STATUSES, type OrderStatus } from "@7mz/shared";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../auth/types";
import { CheckoutQuoteRequestDto, CreateOrderDto } from "./dto/orders.dto";
import { OrdersService } from "./orders.service";

@ApiTags("Orders")
@ApiBearerAuth("access-token")
@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post("quote")
  @ApiOperation({ summary: "Price a cart: subtotal, coupon discount, total, payment methods" })
  quote(@CurrentUser() user: AuthUser, @Body() dto: CheckoutQuoteRequestDto) {
    return this.orders.quote(user.id, dto.items, dto.couponCode);
  }

  @Post()
  @ApiOperation({ summary: "Create an order and initiate payment" })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.orders.createOrder(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "List the user's orders, filterable by status" })
  list(
    @CurrentUser() user: AuthUser,
    @Query("status") status?: string,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ) {
    const normalized: OrderStatus | "all" =
      status && ORDER_STATUSES.includes(status as OrderStatus) ? (status as OrderStatus) : "all";
    const take = limit ? Math.min(Number.parseInt(limit, 10) || 20, 50) : 20;
    return this.orders.listOrders(user.id, normalized, cursor, take);
  }

  @Get(":id")
  @ApiOperation({ summary: "Order detail including decrypted delivered items" })
  detail(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.orders.getOrderDetail(user.id, id);
  }
}

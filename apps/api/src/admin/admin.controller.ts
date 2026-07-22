import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiBearerAuth as Bearer } from "@nestjs/swagger";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../auth/types";
import { AdminService } from "./admin.service";
import {
  AddStockDto,
  AdjustBalanceDto,
  CreateBannerDto,
  CreateCategoryDto,
  CreateCouponDto,
  CreateProductDto,
  UpdateBannerDto,
  UpdateCategoryDto,
  UpdateGatewayDto,
  UpdateProductDto,
  UpdateUserRoleDto,
} from "./dto/admin.dto";

const num = (v: string | undefined, def: number) => {
  const n = v ? Number.parseInt(v, 10) : def;
  return Number.isFinite(n) && n > 0 ? n : def;
};

/**
 * Admin API — all routes require a staff role (MANAGER and above). SUPER_ADMIN
 * is required for destructive/role operations.
 */
@ApiTags("Admin")
@Bearer("access-token")
@Roles("MANAGER")
@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("dashboard")
  @ApiOperation({ summary: "Dashboard metrics, charts, recent activity" })
  dashboard() {
    return this.admin.dashboard();
  }

  // -------- products
  @Get("products")
  products(
    @Query("search") search?: string,
    @Query("categoryId") categoryId?: string,
    @Query("page") page?: string,
  ) {
    return this.admin.listProducts(search, categoryId, num(page, 1), 20);
  }

  @Post("products")
  createProduct(@CurrentUser() u: AuthUser, @Body() dto: CreateProductDto) {
    return this.admin.createProduct(u.id, dto);
  }

  @Patch("products/:id")
  updateProduct(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() dto: UpdateProductDto) {
    return this.admin.updateProduct(u.id, id, dto);
  }

  @Delete("products/:id")
  @Roles("ADMIN")
  deleteProduct(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.admin.deleteProduct(u.id, id);
  }

  @Post("products/:id/duplicate")
  duplicate(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.admin.duplicateProduct(u.id, id);
  }

  @Post("products/:id/stock")
  addStock(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() dto: AddStockDto) {
    return this.admin.addStock(u.id, id, dto.items);
  }

  @Get("products/:id/stock")
  stock(@Param("id") id: string) {
    return this.admin.stockSummary(id);
  }

  // -------- categories
  @Get("categories")
  categories() {
    return this.admin.listCategories();
  }

  @Post("categories")
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.admin.createCategory(dto);
  }

  @Patch("categories/:id")
  updateCategory(@Param("id") id: string, @Body() dto: UpdateCategoryDto) {
    return this.admin.updateCategory(id, dto);
  }

  @Delete("categories/:id")
  @Roles("ADMIN")
  deleteCategory(@Param("id") id: string) {
    return this.admin.deleteCategory(id);
  }

  // -------- orders
  @Get("orders")
  orders(@Query("status") status?: string, @Query("page") page?: string) {
    return this.admin.listOrders(status, num(page, 1), 20);
  }

  @Post("orders/:id/refund")
  @Roles("ADMIN")
  refund(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.admin.refundOrder(u.id, id);
  }

  // -------- users
  @Get("users")
  users(@Query("search") search?: string, @Query("page") page?: string) {
    return this.admin.listUsers(search, num(page, 1), 20);
  }

  @Post("users/:id/balance")
  @Roles("ADMIN")
  adjustBalance(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() dto: AdjustBalanceDto) {
    return this.admin.adjustBalance(u.id, id, dto);
  }

  @Patch("users/:id/role")
  @Roles("SUPER_ADMIN")
  setRole(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() dto: UpdateUserRoleDto) {
    return this.admin.setUserRole(u.id, id, dto.role);
  }

  @Post("users/:id/ban")
  @Roles("ADMIN")
  ban(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.admin.setUserStatus(u.id, id, "BANNED");
  }

  @Post("users/:id/unban")
  @Roles("ADMIN")
  unban(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.admin.setUserStatus(u.id, id, "ACTIVE");
  }

  // -------- coupons
  @Get("coupons")
  coupons() {
    return this.admin.listCoupons();
  }

  @Post("coupons")
  createCoupon(@Body() dto: CreateCouponDto) {
    return this.admin.createCoupon(dto);
  }

  @Post("coupons/:id/toggle")
  toggleCoupon(@Param("id") id: string) {
    return this.admin.toggleCoupon(id);
  }

  @Delete("coupons/:id")
  @Roles("ADMIN")
  deleteCoupon(@Param("id") id: string) {
    return this.admin.deleteCoupon(id);
  }

  // -------- banners
  @Get("banners")
  banners() {
    return this.admin.listBanners();
  }

  @Post("banners")
  createBanner(@Body() dto: CreateBannerDto) {
    return this.admin.createBanner(dto);
  }

  @Patch("banners/:id")
  updateBanner(@Param("id") id: string, @Body() dto: UpdateBannerDto) {
    return this.admin.updateBanner(id, dto);
  }

  @Delete("banners/:id")
  deleteBanner(@Param("id") id: string) {
    return this.admin.deleteBanner(id);
  }

  // -------- payment gateways
  @Get("gateways")
  gateways() {
    return this.admin.listGateways();
  }

  @Patch("gateways/:id")
  @Roles("ADMIN")
  updateGateway(@Param("id") id: string, @Body() dto: UpdateGatewayDto) {
    return this.admin.updateGateway(id, dto);
  }
}

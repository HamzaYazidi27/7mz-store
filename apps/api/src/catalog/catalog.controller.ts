import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../common/decorators/public.decorator";
import { CatalogService } from "./catalog.service";
import { ProductQueryDto } from "./dto/product-query.dto";

@ApiTags("Catalog")
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Public()
  @Get("categories")
  @ApiOperation({ summary: "All visible categories with product counts (nested)" })
  categories() {
    return this.catalog.categories();
  }

  @Public()
  @Get("products")
  @ApiOperation({ summary: "Browse / search products with filters, sorting, cursor pagination" })
  products(@Query() query: ProductQueryDto) {
    return this.catalog.listProducts(query);
  }

  @Public()
  @Get("products/:slug")
  @ApiOperation({ summary: "Product detail by slug" })
  product(@Param("slug") slug: string) {
    return this.catalog.productBySlug(slug);
  }

  @Public()
  @Get("products/:slug/related")
  @ApiOperation({ summary: "Related products from the same category" })
  related(@Param("slug") slug: string) {
    return this.catalog.relatedProducts(slug);
  }

  @Public()
  @Get("products/:slug/reviews")
  @ApiOperation({ summary: "Product reviews with rating distribution summary" })
  reviews(
    @Param("slug") slug: string,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ) {
    const parsed = limit ? Math.min(Number.parseInt(limit, 10) || 10, 30) : 10;
    return this.catalog.productReviews(slug, cursor, parsed);
  }
}

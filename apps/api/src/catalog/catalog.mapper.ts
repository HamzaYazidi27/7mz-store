import {
  discountPercent,
  type BannerDto,
  type CategoryDto,
  type ProductCardDto,
  type ProductDetailDto,
  type ReviewDto,
} from "@7mz/shared";
import type {
  Banner,
  Category,
  Product,
  ProductFaq,
  Review,
} from "../generated/prisma/client";

const NEW_PRODUCT_WINDOW_MS = 14 * 86_400_000;

type ProductWithCategory = Product & { category: Pick<Category, "id" | "name"> };

export function toProductCard(product: ProductWithCategory): ProductCardDto {
  const price = product.price.toFixed(2);
  const compareAt = product.compareAtPrice?.toFixed(2) ?? null;

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription,
    thumbnail: product.thumbnail,
    brandColor: product.brandColor,
    price,
    compareAtPrice: compareAt,
    discountPercent: discountPercent(price, compareAt),
    currency: product.currency,
    rating: product.rating,
    reviewCount: product.reviewCount,
    soldCount: product.soldCount,
    stockCount: product.stockCount,
    deliveryType: product.deliveryType,
    isFeatured: product.isFeatured,
    isFlashSale:
      product.isFlashSale &&
      (product.flashSaleEndsAt === null || product.flashSaleEndsAt.getTime() > Date.now()),
    flashSaleEndsAt: product.flashSaleEndsAt?.toISOString() ?? null,
    isNew: Date.now() - product.createdAt.getTime() < NEW_PRODUCT_WINDOW_MS,
    categoryId: product.category.id,
    categoryName: product.category.name,
  };
}

export function toProductDetail(
  product: ProductWithCategory & { faqs: ProductFaq[] },
): ProductDetailDto {
  return {
    ...toProductCard(product),
    description: product.description,
    images: product.images.length > 0 ? product.images : product.thumbnail ? [product.thumbnail] : [],
    features: product.features,
    tags: product.tags,
    deliveryNote: product.deliveryNote,
    viewCount: product.viewCount,
    faqs: product.faqs.map((faq) => ({
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
    })),
    createdAt: product.createdAt.toISOString(),
  };
}

export function toCategoryDto(
  category: Category & { productCount: number; children?: CategoryDto[] },
): CategoryDto {
  return {
    id: category.id,
    parentId: category.parentId,
    name: category.name,
    slug: category.slug,
    icon: category.icon,
    image: category.image,
    description: category.description,
    accentColor: category.accentColor,
    sortOrder: category.sortOrder,
    productCount: category.productCount,
    ...(category.children ? { children: category.children } : {}),
  };
}

export function toBannerDto(
  banner: Banner & { product: Pick<Product, "slug" | "price"> | null },
): BannerDto {
  return {
    id: banner.id,
    title: banner.title,
    subtitle: banner.subtitle,
    eyebrow: banner.eyebrow,
    image: banner.image,
    ctaLabel: banner.ctaLabel,
    ctaUrl: banner.ctaUrl,
    productId: banner.productId,
    productSlug: banner.product?.slug ?? null,
    productPrice: banner.product?.price.toFixed(2) ?? null,
    accentColor: banner.accentColor,
  };
}

export function toReviewDto(
  review: Review & {
    user: { firstName: string; lastName: string | null; photoUrl: string | null };
  },
  verifiedPurchase: boolean,
): ReviewDto {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt.toISOString(),
    user: {
      firstName: review.user.firstName,
      lastName: review.user.lastName,
      photoUrl: review.user.photoUrl,
    },
    verifiedPurchase,
  };
}

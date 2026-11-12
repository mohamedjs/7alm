import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import { dbOf } from "../../../shared/infrastructure/prisma/unit-of-work";
import { Prisma } from "../../../generated/prisma/client";
import { toCategoryDto, toProductDto } from "./catalog.mappers";
import type { CategoryDto, CategoryWrite, ProductDto, ProductWrite } from "../domain/catalog.types";
import type { CatalogStore } from "../domain/ports";



function productData(input: ProductWrite) {
  const { quantity_prices, ...rest } = input;
  return {
    ...rest,
    ...(quantity_prices !== undefined
      ? { quantity_prices: quantity_prices === null ? Prisma.DbNull : (quantity_prices as Prisma.InputJsonValue) }
      : {}),
  };
}

/** The only place catalog touches Prisma. */
@Injectable()
export class CatalogRepository implements CatalogStore {
  constructor(private readonly prisma: PrismaService) {}

  async listProducts(where: { activeOnly?: boolean; featured?: boolean; categoryIds?: string[] } = {}): Promise<ProductDto[]> {
    const rows = await this.prisma.product.findMany({
      where: {
        ...(where.activeOnly ? { is_active: true } : {}),
        ...(where.featured ? { is_featured: true } : {}),
        ...(where.categoryIds ? { category_id: { in: where.categoryIds } } : {}),
      },
      orderBy: where.featured
        ? [{ featured_sort: { sort: "asc", nulls: "last" } }, { created_at: "asc" }]
        : [{ created_at: "desc" }],
    });
    return rows.map(toProductDto);
  }

  async findProductById(id: string, tx?: unknown): Promise<ProductDto | null> {
    const row = await dbOf(this.prisma, tx).product.findUnique({ where: { id } });
    return row ? toProductDto(row) : null;
  }

  async findProductsByIds(ids: string[], tx?: unknown): Promise<ProductDto[]> {
    const rows = await dbOf(this.prisma, tx).product.findMany({ where: { id: { in: ids } } });
    return rows.map(toProductDto);
  }

  async findActiveProductBySlug(slug: string): Promise<ProductDto | null> {
    const row = await this.prisma.product.findFirst({ where: { slug, is_active: true } });
    return row ? toProductDto(row) : null;
  }

  async searchActive(query: string, limit = 20): Promise<ProductDto[]> {
    const rows = await this.prisma.product.findMany({
      where: { is_active: true, name: { contains: query, mode: "insensitive" } },
      orderBy: { created_at: "desc" },
      take: limit,
    });
    return rows.map(toProductDto);
  }

  /** Order counts per product across legacy single-product orders and cart line items. */
  async orderCountsByProduct(): Promise<Map<string, number>> {
    const rows = await this.prisma.$queryRaw<{ product_id: string; n: bigint }[]>`
      SELECT product_id, COUNT(*)::bigint AS n FROM (
        SELECT product_id FROM orders WHERE product_id IS NOT NULL
        UNION ALL
        SELECT product_id FROM order_items WHERE product_id IS NOT NULL
      ) t GROUP BY product_id`;
    return new Map(rows.map((r) => [r.product_id, Number(r.n)]));
  }

  async createProduct(input: ProductWrite): Promise<ProductDto> {
    return toProductDto(await this.prisma.product.create({ data: productData(input) as Prisma.ProductUncheckedCreateInput }));
  }

  async updateProduct(id: string, input: ProductWrite): Promise<ProductDto> {
    return toProductDto(await this.prisma.product.update({ where: { id }, data: productData(input) as Prisma.ProductUncheckedUpdateInput }));
  }

  async deleteProduct(id: string): Promise<void> {
    await this.prisma.product.delete({ where: { id } });
  }

  /**
   * Atomic stock change. A decrement only succeeds when enough stock is left
   * (no oversell under concurrency); the status is recomputed in SQL.
   */
  async adjustStock(productId: string, delta: number, tx?: unknown): Promise<boolean> {
    const db = dbOf(this.prisma, tx);
    const updated = await db.$executeRaw`
      UPDATE products
      SET quantity = GREATEST(quantity + ${delta}, 0),
          stock_status = CASE
            WHEN quantity + ${delta} <= 0 THEN 'out_of_stock'
            WHEN quantity + ${delta} <= 5 THEN 'low_stock'
            ELSE 'in_stock' END,
          updated_at = now()
      WHERE id = ${productId}::uuid AND (${delta} >= 0 OR quantity >= ${-delta})`;
    return updated === 1;
  }

  async listCategories(activeOnly: boolean): Promise<CategoryDto[]> {
    const rows = await this.prisma.category.findMany({
      where: activeOnly ? { is_active: true } : {},
      orderBy: { sort_order: "asc" },
    });
    return rows.map(toCategoryDto);
  }

  async findCategoryBySlug(slug: string): Promise<CategoryDto | null> {
    const row = await this.prisma.category.findUnique({ where: { slug } });
    return row ? toCategoryDto(row) : null;
  }

  async createCategory(input: CategoryWrite): Promise<CategoryDto> {
    return toCategoryDto(await this.prisma.category.create({ data: input as Prisma.CategoryUncheckedCreateInput }));
  }

  async updateCategory(id: string, input: CategoryWrite): Promise<CategoryDto> {
    return toCategoryDto(await this.prisma.category.update({ where: { id }, data: input }));
  }

  async deleteCategory(id: string): Promise<void> {
    await this.prisma.category.delete({ where: { id } });
  }
}

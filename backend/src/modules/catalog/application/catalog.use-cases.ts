import { Inject, Injectable } from "@nestjs/common";
import { DomainError } from "../../../shared/domain/domain-error";
import { Topics } from "../../../shared/domain/topics";
import { UNIT_OF_WORK, type UnitOfWork } from "../../../shared/application/unit-of-work.port";
import { CACHE, type Cache } from "../../../shared/application/cache.port";
import { assertNoCycle, categoryWithChildren } from "../domain/category";
import { assertValidSlug, assertValidThemeColor, discountPercentage, stockStatusFor } from "../domain/product";
import { CATALOG_STORE, type CatalogStore } from "../domain/ports";
import type { CategoryDto, CategoryWrite, ProductDto, ProductWrite } from "../domain/catalog.types";

const CACHE_PREFIX = "cache:catalog:";
const CACHE_TTL = 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Read side for the storefront, landing pages and agents. Cached in Redis, invalidated on every write. */
@Injectable()
export class CatalogQueries {
  constructor(
    @Inject(CATALOG_STORE) private readonly store: CatalogStore,
    @Inject(CACHE) private readonly redis: Cache,
  ) {}

  private async cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    const hit = await this.redis.getJson<T>(CACHE_PREFIX + key).catch(() => null);
    if (hit !== null) return hit;
    const value = await load();
    // Never cache "nothing": an empty catalog right after deploy must not stick for the TTL.
    const empty = value === null || (Array.isArray(value) && value.length === 0);
    if (!empty) await this.redis.setJson(CACHE_PREFIX + key, value, CACHE_TTL).catch(() => undefined);
    return value;
  }

  allActive() {
    return this.cached("active", () => this.store.listProducts({ activeOnly: true }));
  }

  featured() {
    return this.cached("featured", () => this.store.listProducts({ activeOnly: true, featured: true }));
  }

  bySlug(slug: string) {
    return this.cached(`slug:${slug}`, () => this.store.findActiveProductBySlug(slug));
  }

  async byCategory(idOrSlug: string): Promise<ProductDto[]> {
    return this.cached(`category:${idOrSlug}`, async () => {
      const categories = await this.store.listCategories(false);
      const id = UUID.test(idOrSlug) ? idOrSlug : categories.find((c) => c.slug === idOrSlug)?.id;
      if (!id) return [];
      return this.store.listProducts({ activeOnly: true, categoryIds: categoryWithChildren(id, categories) });
    });
  }

  /** Most-ordered active products, padded with the newest when history is thin. */
  async bestSellers(limit = 8): Promise<ProductDto[]> {
    return this.cached(`best:${limit}`, async () => {
      const [counts, active] = await Promise.all([this.store.orderCountsByProduct(), this.store.listProducts({ activeOnly: true })]);
      const byId = new Map(active.map((p) => [p.id, p]));
      const ranked = [...counts.entries()]
        .filter(([id]) => byId.has(id))
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => byId.get(id)!);
      const rankedIds = new Set(ranked.map((p) => p.id));
      return [...ranked, ...active.filter((p) => !rankedIds.has(p.id))].slice(0, limit);
    });
  }

  async search(query: string) {
    const q = (query || "").trim();
    if (q.length < 2) return [];
    return this.store.searchActive(q);
  }

  activeCategories() {
    return this.cached("categories:active", () => this.store.listCategories(true));
  }

  categoryBySlug(slug: string) {
    return this.cached(`categories:slug:${slug}`, () => this.store.findCategoryBySlug(slug));
  }

  /** Lean, decision-ready product view for the n8n sales agent. */
  async forAgent() {
    const products = await this.allActive();
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      main_image: p.main_image,
      availability: {
        status: p.stock_status,
        available_quantity: p.quantity,
        can_order: p.stock_status !== "out_of_stock" && p.quantity > 0,
      },
      pricing: {
        currency: "EGP" as const,
        unit_price: p.price,
        compare_at_price: p.compare_at_price,
        discount_percentage: discountPercentage(p.price, p.compare_at_price),
      },
      quantity_offers: (p.quantity_prices ?? []).map((t) => ({
        min_quantity: t.min_quantity,
        label: t.label,
        unit_price: t.price,
        compare_at_price: t.compare_at_price,
        is_special: t.is_special,
      })),
    }));
  }
}

/** Admin writes. Each write invalidates the catalog cache and announces itself on `catalog.events`. */
@Injectable()
export class CatalogAdmin {
  constructor(
    @Inject(CATALOG_STORE) private readonly store: CatalogStore,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(CACHE) private readonly redis: Cache,
  ) {}

  private async changed(type: string, key: string, payload: Record<string, unknown>) {
    await this.redis.delByPrefix(CACHE_PREFIX).catch(() => undefined);
    await this.uow.publish([{ topic: Topics.catalogEvents, key, type, payload }]);
  }

  private validate(input: ProductWrite) {
    if (typeof input.slug === "string") assertValidSlug(input.slug);
    if (typeof input.theme_color === "string") assertValidThemeColor(input.theme_color);
    if (typeof input.quantity === "number" && input.stock_status === undefined) {
      input.stock_status = stockStatusFor(input.quantity);
    }
  }

  listProducts() {
    return this.store.listProducts();
  }

  async createProduct(input: ProductWrite): Promise<ProductDto> {
    if (!input.name || !input.slug) throw DomainError.validation("name and slug are required");
    this.validate(input);
    const product = await this.store.createProduct(input);
    await this.changed("catalog.product.created", product.id, { id: product.id, slug: product.slug });
    return product;
  }

  async updateProduct(id: string, input: ProductWrite): Promise<ProductDto> {
    this.validate(input);
    const product = await this.store.updateProduct(id, input);
    await this.changed("catalog.product.updated", id, { id, slug: product.slug });
    return product;
  }

  async deleteProduct(id: string): Promise<void> {
    await this.store.deleteProduct(id);
    await this.changed("catalog.product.deleted", id, { id });
  }

  listCategories() {
    return this.store.listCategories(false);
  }

  private async validateCategory(input: CategoryWrite, id?: string) {
    const all = await this.store.listCategories(false);
    assertNoCycle(id, input.parent_id, all);
    if (input.slug) {
      assertValidSlug(input.slug);
      const clash = all.find((c) => c.slug === input.slug && c.id !== id);
      if (clash) throw DomainError.conflict("Category slug must be unique.");
    }
  }

  async createCategory(input: CategoryWrite): Promise<CategoryDto> {
    if (!input.slug || !input.name_ar || !input.name_en) throw DomainError.validation("slug, name_ar and name_en are required");
    await this.validateCategory(input);
    const category = await this.store.createCategory(input);
    await this.changed("catalog.category.created", category.id, { id: category.id });
    return category;
  }

  async updateCategory(id: string, input: CategoryWrite): Promise<CategoryDto> {
    await this.validateCategory(input, id);
    const category = await this.store.updateCategory(id, input);
    await this.changed("catalog.category.updated", id, { id });
    return category;
  }

  async deleteCategory(id: string): Promise<void> {
    await this.store.deleteCategory(id);
    await this.changed("catalog.category.deleted", id, { id });
  }
}

/**
 * Synchronous public API other modules call (ordering prices a cart and
 * reserves stock inside its own transaction). Exported via index.ts.
 */
@Injectable()
export class CatalogFacade {
  constructor(
    @Inject(CATALOG_STORE) private readonly store: CatalogStore,
    @Inject(CACHE) private readonly redis: Cache,
  ) {}

  getProducts(ids: string[], tx?: unknown) {
    return this.store.findProductsByIds(ids, tx);
  }

  getProduct(id: string, tx?: unknown) {
    return this.store.findProductById(id, tx);
  }

  async reserveStock(productId: string, quantity: number, tx?: unknown): Promise<boolean> {
    const ok = await this.store.adjustStock(productId, -quantity, tx);
    await this.redis.delByPrefix(CACHE_PREFIX).catch(() => undefined);
    return ok;
  }

  async releaseStock(productId: string, quantity: number, tx?: unknown): Promise<void> {
    await this.store.adjustStock(productId, quantity, tx);
    await this.redis.delByPrefix(CACHE_PREFIX).catch(() => undefined);
  }
}

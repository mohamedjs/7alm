import { productRepository } from "./products.repository";
import { categoryService } from "@/features/categories/categories.service";
import type { ActiveProductDto, Product } from "@/features/shared/types";

export class ProductService {
  async getActiveProduct(): Promise<Product[] | null> {
    return productRepository.getActiveProduct();
  }

  async getActiveProductForAgent(): Promise<ActiveProductDto[] | null> {
    const products = await productRepository.getActiveProduct();
    if (!products || products.length === 0) return null;

    return products.map(product => {
      const discountPercentage =
        product.compare_at_price && product.compare_at_price > product.price
          ? Math.round(
              ((product.compare_at_price - product.price) /
                product.compare_at_price) *
                100
            )
          : 0;

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        main_image: product.main_image,
        availability: {
          status: product.stock_status,
          available_quantity: product.quantity,
          can_order: product.stock_status !== "out_of_stock" && product.quantity > 0,
        },
        pricing: {
          currency: "EGP",
          unit_price: product.price,
          compare_at_price: product.compare_at_price,
          discount_percentage: discountPercentage,
        },
        quantity_offers: (product.quantity_prices ?? []).map((tier) => ({
          min_quantity: tier.min_quantity,
          label: tier.label,
          unit_price: tier.price,
          compare_at_price: tier.compare_at_price,
          is_special: tier.is_special,
        })),
      };
    });
  }

  async getProductById(id: string): Promise<Product | null> {
    return productRepository.getProductById(id);
  }

  async getProductBySlug(slug: string): Promise<Product | null> {
    return productRepository.getProductBySlug(slug);
  }

  /**
   * Reserved single-segment route slugs that the (store) route group's
   * static routes always win over (Next.js matches static segments before
   * dynamic ones). A product using one of these slugs would have its
   * `(landing)/[slug]` funnel page permanently shadowed.
   */
  static readonly RESERVED_SLUGS = [
    "products",
    "category",
    "product",
    "cart",
    "checkout",
    "privacy",
    "admin",
  ] as const;

  /**
   * Throws if `slug` collides with a reserved route segment. Called from the
   * admin product create/update path before the row is written.
   */
  validateProductSlug(slug: string): void {
    if (ProductService.RESERVED_SLUGS.includes(slug as never)) {
      throw new Error(
        `Slug "${slug}" is reserved for a store route and cannot be used for a product.`
      );
    }
  }

  /**
   * Throws if `color` isn't a `#rrggbb` hex color. Called from the admin
   * product create/update path when `theme_color` is present in the body.
   */
  validateThemeColor(color: string): void {
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
      throw new Error(`theme_color "${color}" must be a #rrggbb hex color.`);
    }
  }

  /**
   * Active products flagged `is_featured` — the Lookbook homepage's hero
   * thumbnail row.
   */
  async getFeaturedProducts(): Promise<Product[]> {
    return productRepository.getFeaturedProducts();
  }

  /**
   * Best sellers by total order count — the store homepage's "Best
   * Sellers" section. See `productRepository.getBestSellerProducts` for
   * the tally + fallback-padding logic.
   */
  async getBestSellerProducts(limit = 8): Promise<Product[]> {
    return productRepository.getBestSellerProducts(limit);
  }

  /**
   * Active products in a category, looked up by either the category's
   * UUID or its slug (storefront links use slugs; internal callers may
   * already have the id). Includes products assigned directly to
   * immediate subcategories too — e.g. `electronics-accessories`'s
   * existing phone cases live on its `cover` child, not the parent
   * itself, and should still show up under the top-level category page.
   */
  async getActiveProductsByCategory(categoryIdOrSlug: string): Promise<Product[]> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      categoryIdOrSlug
    );
    const categoryId = isUuid
      ? categoryIdOrSlug
      : (await categoryService.getCategoryBySlug(categoryIdOrSlug))?.id;
    if (!categoryId) return [];

    const allCategories = await categoryService.getAllCategories();
    const childIds = allCategories
      .filter((c) => c.parent_id === categoryId)
      .map((c) => c.id);

    return productRepository.getActiveProductsByCategoryIds([categoryId, ...childIds]);
  }

  /**
   * Every active product across all categories.
   */
  async getAllActiveProducts(): Promise<Product[]> {
    return productRepository.getAllActiveProducts();
  }

  async decrementStock(productId: string, quantity: number): Promise<boolean> {
    const product = await productRepository.getProductById(productId);
    if (!product) return false;
    if (product.quantity < quantity) return false;
    return productRepository.updateStock(productId, -quantity);
  }

  async incrementStock(productId: string, quantity: number): Promise<boolean> {
    return productRepository.updateStock(productId, quantity);
  }
}

export const productService = new ProductService();


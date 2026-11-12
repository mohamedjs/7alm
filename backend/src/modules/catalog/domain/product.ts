import { DomainError } from "../../../shared/domain/domain-error";
import { round2 } from "../../../shared/domain/money";

export type StockStatus = "in_stock" | "out_of_stock" | "low_stock";

export interface QuantityPriceTier {
  min_quantity: number;
  price: number;
  compare_at_price: number | null;
  label: string;
  is_special: boolean;
}

/** Slugs that collide with storefront routes (`/{slug}` is a landing page). */
export const RESERVED_SLUGS = ["products", "category", "product", "cart", "checkout", "privacy", "admin", "review", "api", "uploads"];

export const LOW_STOCK_THRESHOLD = 5;

export function assertValidSlug(slug: string): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw DomainError.validation(`Slug "${slug}" must be lowercase letters, digits and dashes.`);
  }
  if (RESERVED_SLUGS.includes(slug)) {
    throw DomainError.validation(`Slug "${slug}" is reserved for a store route and cannot be used for a product.`);
  }
}

export function assertValidThemeColor(color: string): void {
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    throw DomainError.validation(`theme_color "${color}" must be a #rrggbb hex color.`);
  }
}

export function stockStatusFor(quantity: number): StockStatus {
  if (quantity <= 0) return "out_of_stock";
  if (quantity <= LOW_STOCK_THRESHOLD) return "low_stock";
  return "in_stock";
}

/** The pricing-relevant slice of a product, as ordering sees it. */
export interface PricedProduct {
  id: string;
  name: string;
  price: number;
  quantity: number;
  stock_status: StockStatus;
  quantity_prices: QuantityPriceTier[] | null;
}

export function canOrder(product: PricedProduct, quantity: number): boolean {
  return product.stock_status !== "out_of_stock" && product.quantity >= quantity;
}

/**
 * Line total for `quantity` units, honouring quantity tiers: the highest tier
 * whose `min_quantity` is reached sets the per-unit price (`tier.price` is the
 * bundle price for exactly `min_quantity` units). Below every tier, or with
 * no tiers, the base price applies. Identical to v1 `calculateLineTotal`.
 */
export function lineTotal(product: PricedProduct, quantity: number): number {
  const tiers = product.quantity_prices;
  if (tiers && tiers.length > 0) {
    const match = [...tiers].sort((a, b) => b.min_quantity - a.min_quantity).find((t) => quantity >= t.min_quantity);
    if (match) {
      if (quantity === match.min_quantity) return round2(match.price);
      return round2((match.price / match.min_quantity) * quantity);
    }
  }
  return round2(product.price * quantity);
}

export function discountPercentage(price: number, compareAt: number | null): number {
  return compareAt && compareAt > price ? Math.round(((compareAt - price) / compareAt) * 100) : 0;
}

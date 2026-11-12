import { round2 } from "../../../shared/domain/money";
import { DomainError } from "../../../shared/domain/domain-error";
import { canOrder, lineTotal, type PricedProduct } from "../../catalog";

export interface RequestedLine {
  product_id: string;
  quantity: number;
}

export interface PricedLine {
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

/** Prices every line server-side from catalog data (never trusts client prices). */
export function priceLines(requested: RequestedLine[], products: PricedProduct[]): PricedLine[] {
  if (requested.length === 0) throw DomainError.validation("No items provided for cart order");
  const byId = new Map(products.map((p) => [p.id, p]));
  return requested.map((line) => {
    const product = byId.get(line.product_id);
    if (!product) throw DomainError.validation(`Product ${line.product_id} not found`);
    const quantity = Math.max(1, Math.floor(line.quantity || 1));
    if (!canOrder(product, quantity)) {
      throw DomainError.validation(`Product ${line.product_id} is out of stock or insufficient quantity available`);
    }
    const total = lineTotal(product, quantity);
    return { product_id: product.id, quantity, unit_price: round2(total / quantity), total_price: total };
  });
}

export function orderTotals(lines: PricedLine[], shipping: number, discount = 0, finalShipping = shipping) {
  const subtotal = round2(lines.reduce((s, l) => s + l.total_price, 0));
  return {
    subtotal,
    discount_amount: round2(discount),
    shipping_cost: round2(finalShipping),
    total_price: round2(subtotal - discount + finalShipping),
  };
}

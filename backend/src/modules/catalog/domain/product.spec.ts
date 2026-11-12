import { describe, expect, it } from "vitest";
import { assertValidSlug, canOrder, lineTotal, stockStatusFor, type PricedProduct } from "./product";
import { assertNoCycle } from "./category";

const base: PricedProduct = { id: "p", name: "P", price: 299, quantity: 10, stock_status: "in_stock", quantity_prices: null };
const tiered: PricedProduct = {
  ...base,
  quantity_prices: [
    { min_quantity: 1, price: 299, compare_at_price: 499, label: "1", is_special: false },
    { min_quantity: 2, price: 550, compare_at_price: 998, label: "2", is_special: true },
    { min_quantity: 3, price: 747, compare_at_price: 1497, label: "3", is_special: true },
  ],
};

describe("lineTotal", () => {
  it("uses the base price without tiers", () => expect(lineTotal(base, 3)).toBe(897));
  it("uses the exact tier bundle price", () => expect(lineTotal(tiered, 2)).toBe(550));
  it("scales the highest reached tier's unit price", () => expect(lineTotal(tiered, 4)).toBe(996));
});

describe("stock rules", () => {
  it("derives status from quantity", () => {
    expect(stockStatusFor(0)).toBe("out_of_stock");
    expect(stockStatusFor(5)).toBe("low_stock");
    expect(stockStatusFor(6)).toBe("in_stock");
  });
  it("blocks orders above stock", () => expect(canOrder(base, 11)).toBe(false));
});

describe("slugs and categories", () => {
  it("rejects reserved slugs", () => expect(() => assertValidSlug("checkout")).toThrow(/reserved/));
  it("rejects a parent cycle", () => {
    const all = [
      { id: "a", parent_id: null },
      { id: "b", parent_id: "a" },
      { id: "c", parent_id: "b" },
    ];
    expect(() => assertNoCycle("a", "c", all)).toThrow(/cycle/);
    expect(() => assertNoCycle("c", "a", all)).not.toThrow();
  });
});

import { describe, expect, it } from "vitest";
import { Order } from "./order";
import { priceLines, orderTotals } from "./checkout";

const fresh = (status: "pending" | "approved" = "pending") =>
  Order.restore({
    id: "o1",
    status,
    productLines: [{ productId: "p1", quantity: 2 }],
    shippingProvider: null,
    trackingId: null,
    requiresConfirmation: true,
    stockReserved: status === "approved",
  });

describe("Order state machine", () => {
  it("approves, confirms and records events", () => {
    const o = fresh();
    o.approve("test", true);
    o.confirm("TRK1");
    const events = o.pullEvents();
    expect(events.map((e) => e.payload.to)).toEqual(["approved", "confirmed"]);
    expect(o.trackingId).toBe("TRK1");
  });

  it("restocks only when cancelling an approved order", () => {
    expect(fresh("pending").cancel()).toEqual([]);
    expect(fresh("approved").cancel()).toEqual([{ productId: "p1", quantity: 2 }]);
  });

  it("rejects illegal jumps", () => {
    expect(() => fresh().advance("delivered")).toThrow(/Cannot change status/);
  });

  it("ignores duplicate courier events", () => {
    const o = fresh();
    expect(o.advanceIfAllowed("delivered")).toBe(false);
    expect(o.pullEvents()).toHaveLength(0);
  });
});

describe("checkout pricing", () => {
  const product = { id: "p1", name: "P", price: 100, quantity: 5, stock_status: "in_stock" as const, quantity_prices: null };
  it("prices lines and totals with coupon and shipping", () => {
    const lines = priceLines([{ product_id: "p1", quantity: 2 }], [product]);
    expect(orderTotals(lines, 50, 20, 50)).toEqual({ subtotal: 200, discount_amount: 20, shipping_cost: 50, total_price: 230 });
  });
  it("refuses more than stock", () => {
    expect(() => priceLines([{ product_id: "p1", quantity: 9 }], [product])).toThrow(/out of stock/);
  });
});

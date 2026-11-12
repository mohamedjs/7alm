import { describe, expect, it } from "vitest";
import { z } from "zod";
import { nullableDate, nullableNumber, nullableUuid } from "./form-fields";

describe("form field helpers", () => {
  const schema = z.object({ category_id: nullableUuid(), compare_at_price: nullableNumber(), expires_at: nullableDate() });
  it("turns blank form values into null", () => {
    expect(schema.parse({ category_id: "", compare_at_price: "", expires_at: "" })).toEqual({ category_id: null, compare_at_price: null, expires_at: null });
  });
  it("accepts datetime-local values without an offset", () => {
    expect(schema.parse({ expires_at: "2026-11-12T10:00" }).expires_at).toMatch(/^2026-11-12T\d\d:00:00\.000Z$/);
  });
  it("still rejects junk", () => {
    expect(() => schema.parse({ category_id: "not-a-uuid" })).toThrow();
    expect(() => schema.parse({ expires_at: "tomorrow-ish" })).toThrow();
  });
});

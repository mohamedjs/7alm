import { z, type ZodType } from "zod";

/**
 * HTML forms send "" for an untouched optional field. These helpers turn ""
 * (and whitespace-only strings) into null before validating, so admin forms
 * that worked against the v1 raw-insert API keep working with v2's schemas.
 */
const blankToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

export const nullable = <T extends ZodType>(schema: T) => z.preprocess(blankToNull, schema.nullable().optional());

export const nullableNumber = () => nullable(z.coerce.number().min(0));
export const nullableInt = (min = 0) => nullable(z.coerce.number().int().min(min));
export const nullableText = () => nullable(z.string());
export const nullableUuid = () => nullable(z.string().uuid());

/** Accepts ISO strings with or without offset (`<input type="datetime-local">` sends `2026-11-12T10:00`). */
export const nullableDate = () =>
  z.preprocess(
    blankToNull,
    z
      .union([z.string(), z.date()])
      .nullable()
      .optional()
      .transform((v, ctx) => {
        if (v === null || v === undefined) return v;
        const d = v instanceof Date ? v : new Date(v);
        if (Number.isNaN(d.getTime())) {
          ctx.addIssue({ code: "custom", message: "Invalid date" });
          return z.NEVER;
        }
        return d.toISOString();
      }),
  );

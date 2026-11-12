import crypto from "node:crypto";

/**
 * Validates `X-Hub-Signature-256: sha256=<hex>` — HMAC-SHA256 of the exact
 * request bytes keyed with the app secret. Must run on the raw body, before
 * any JSON parsing/re-serialisation (Meta signs the escaped-unicode bytes it sent).
 */
export function verifyMetaSignature(rawBody: Buffer | undefined, header: string | undefined, appSecret: string | undefined): boolean {
  if (!rawBody || !header || !appSecret) return false;
  const [algo, sig] = header.split("=", 2);
  if (algo !== "sha256" || !sig || !/^[0-9a-f]+$/i.test(sig)) return false;
  const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const a = Buffer.from(sig.toLowerCase(), "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function signMetaBody(rawBody: Buffer | string, appSecret: string): string {
  return "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
}

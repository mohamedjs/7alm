/**
 * AES-256-GCM token encryption helper for the Social Connections feature
 * (src/features/social/*). Used to encrypt OAuth access/refresh tokens
 * before they are written to `social_connections`, and to decrypt them
 * only where strictly needed server-side (e.g. calling `revoke()`).
 *
 * Env is read LAZILY inside `getKey()` — never at module import — so a
 * missing `SOCIAL_TOKEN_ENCRYPTION_KEY` does not break `npm run build`
 * (Next.js evaluates modules at build time).
 */
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // recommended IV length for GCM
const KEY_LENGTH = 32; // AES-256 key length in bytes

/**
 * Resolve the 32-byte encryption key from `SOCIAL_TOKEN_ENCRYPTION_KEY`.
 * Accepts a real 32-byte key encoded as hex or base64 and uses it as-is.
 * Any other value (including short demo/placeholder strings) is hashed
 * with SHA-256 to deterministically derive a 32-byte key, so the mock
 * demo works with zero real secret material configured.
 */
function getKey(): Buffer {
  const raw = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "SOCIAL_TOKEN_ENCRYPTION_KEY is not set. Add a 32-byte hex/base64 value (or any placeholder string) to your environment."
    );
  }

  const decoded = tryDecodeExactLength(raw);
  if (decoded) return decoded;

  return crypto.createHash("sha256").update(raw, "utf8").digest();
}

/** Try to decode `raw` as hex or base64 and return it only if it's exactly KEY_LENGTH bytes. */
function tryDecodeExactLength(raw: string): Buffer | null {
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length === KEY_LENGTH * 2) {
    return Buffer.from(raw, "hex");
  }

  try {
    const buf = Buffer.from(raw, "base64");
    if (buf.length === KEY_LENGTH) return buf;
  } catch {
    // fall through — not valid base64
  }

  return null;
}

/**
 * Encrypt a plaintext string (e.g. an OAuth access token).
 * Output format: `iv:authTag:ciphertext`, each part base64-encoded.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

/**
 * Decrypt a payload produced by `encrypt()`.
 * Throws if the payload is malformed or fails GCM authentication
 * (tampered ciphertext or wrong key).
 */
export function decrypt(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted payload format — expected iv:authTag:ciphertext");
  }
  const [ivB64, authTagB64, ciphertextB64] = parts;

  const key = getKey();
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}

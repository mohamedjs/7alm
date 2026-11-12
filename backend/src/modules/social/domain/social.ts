import crypto from "node:crypto";
import { DomainError } from "../../../shared/domain/domain-error";

export type SocialPlatform = "facebook" | "instagram" | "tiktok" | "whatsapp";
export const ALL_PLATFORMS: SocialPlatform[] = ["facebook", "instagram", "tiktok", "whatsapp"];
export const isSocialPlatform = (v: unknown): v is SocialPlatform => typeof v === "string" && (ALL_PLATFORMS as string[]).includes(v);

export interface TokenResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scopes?: string[];
}

export interface AccountInfo {
  accountId: string;
  accountName: string;
  avatarUrl?: string;
  /** Page id, IG account id, WABA / phone number ids… whatever the inbox needs. */
  metadata?: Record<string, unknown>;
  /** Token to store instead of the user token (e.g. the Page token). */
  storedToken?: string;
}

/** OAuth Strategy per platform (Factory picks real or mock). */
export interface SocialProvider {
  readonly platform: SocialPlatform;
  readonly isConfigured: boolean;
  authUrl(state: string, redirectUri: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<TokenResult>;
  accountInfo(token: TokenResult): Promise<AccountInfo>;
  /** Hook after saving: subscribe webhooks etc. Best effort. */
  afterConnect?(info: AccountInfo, token: string): Promise<void>;
  revoke?(accessToken: string): Promise<void>;
}

export interface OAuthState {
  platform: SocialPlatform;
  adminId: string | null;
  nonce: string;
  exp: number;
}

export const STATE_TTL_MS = 10 * 60 * 1000;

export function signState(payload: OAuthState, secret: string): string {
  const data = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${data}.${crypto.createHmac("sha256", secret).update(data).digest("base64url")}`;
}

export function verifyState(state: string, platform: SocialPlatform, secret: string, now = Date.now()): OAuthState {
  const [data, sig] = (state || "").split(".");
  if (!data || !sig) throw DomainError.validation("Malformed OAuth state.");
  const expected = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw DomainError.validation("Invalid OAuth state signature.");
  const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as OAuthState;
  if (payload.exp < now) throw DomainError.validation("OAuth state has expired — please try connecting again.");
  if (payload.platform !== platform) throw DomainError.validation("OAuth state platform mismatch.");
  return payload;
}

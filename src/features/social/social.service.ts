import crypto from "crypto";
import { socialFactory } from "./social.factory";
import { socialRepository } from "./social.repository";
import type {
  SocialConnectionPublic,
  SocialPlatform,
} from "@/features/shared/types";

const ALL_PLATFORMS: SocialPlatform[] = ["facebook", "instagram", "tiktok", "whatsapp"];
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface OAuthStatePayload {
  platform: SocialPlatform;
  adminId: string | null;
  nonce: string;
  exp: number; // epoch ms
}

/** Env is read lazily — inside this function, never at module import. */
function getStateSecret(): string {
  const key = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "SOCIAL_TOKEN_ENCRYPTION_KEY is not set — required to sign the OAuth state cookie."
    );
  }
  return key;
}

/** Env is read lazily — inside this function, never at module import. */
function getRedirectBase(): string {
  return process.env.SOCIAL_OAUTH_REDIRECT_BASE || "http://localhost:3000";
}

function getCallbackUrl(platform: SocialPlatform): string {
  return `${getRedirectBase()}/api/connections/${platform}/callback`;
}

/** Sign an OAuth state payload with HMAC-SHA256, keyed by SOCIAL_TOKEN_ENCRYPTION_KEY. */
function signState(payload: OAuthStatePayload): string {
  const json = JSON.stringify(payload);
  const data = Buffer.from(json, "utf8").toString("base64url");
  const signature = crypto.createHmac("sha256", getStateSecret()).update(data).digest("base64url");
  return `${data}.${signature}`;
}

/** Verify a signed OAuth state, checking signature, expiry, and platform match. */
function verifyState(state: string, expectedPlatform: SocialPlatform): OAuthStatePayload {
  const [data, signature] = state.split(".");
  if (!data || !signature) {
    throw new Error("Malformed OAuth state.");
  }

  const expectedSignature = crypto
    .createHmac("sha256", getStateSecret())
    .update(data)
    .digest("base64url");

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    throw new Error("Invalid OAuth state signature.");
  }

  const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as OAuthStatePayload;

  if (payload.exp < Date.now()) {
    throw new Error("OAuth state has expired — please try connecting again.");
  }
  if (payload.platform !== expectedPlatform) {
    throw new Error("OAuth state platform mismatch.");
  }

  return payload;
}

/**
 * Orchestration for the social "connect accounts" flow.
 * Calls `social.factory.ts` for the provider and `social.repository.ts`
 * for persistence — never touches Supabase or the crypto helper directly.
 */
export class SocialService {
  /** Step 1 of the connect flow: build the provider authorize URL + a signed state. */
  async initiateConnect(
    platform: SocialPlatform,
    adminId: string | null
  ): Promise<{ authUrl: string; state: string }> {
    const provider = socialFactory.getProvider(platform);

    const state = signState({
      platform,
      adminId,
      nonce: crypto.randomBytes(16).toString("hex"),
      exp: Date.now() + STATE_TTL_MS,
    });

    const authUrl = provider.getAuthUrl(state, getCallbackUrl(platform));
    return { authUrl, state };
  }

  /**
   * Step 2: handle the OAuth redirect. Verifies the signed state, exchanges
   * the code for a token, fetches account info, and persists the encrypted
   * connection. Throws on any failure — the caller (the callback route)
   * is responsible for turning that into a redirect with `?error=`.
   */
  async handleCallback(platform: SocialPlatform, code: string, state: string): Promise<void> {
    const payload = verifyState(state, platform);
    const provider = socialFactory.getProvider(platform);

    const tokenResult = await provider.exchangeCode(code, getCallbackUrl(platform));
    const accountInfo = await provider.getAccountInfo(tokenResult.accessToken);

    const tokenExpiresAt = tokenResult.expiresIn
      ? new Date(Date.now() + tokenResult.expiresIn * 1000).toISOString()
      : null;

    await socialRepository.upsertConnection({
      platform,
      accountId: accountInfo.accountId,
      accountName: accountInfo.accountName,
      avatarUrl: accountInfo.avatarUrl ?? null,
      accessToken: tokenResult.accessToken,
      refreshToken: tokenResult.refreshToken ?? null,
      tokenExpiresAt,
      scopes: tokenResult.scopes ?? [],
      connectedBy: payload.adminId,
      metadata: accountInfo.metadata ?? {},
    });
  }

  /**
   * All 4 platforms, merged with existing rows. Platforms without a row
   * report `status: "disconnected"`. Returns the public DTO only — no
   * tokens ever leave this layer.
   */
  async listConnections(): Promise<SocialConnectionPublic[]> {
    const rows = await socialRepository.getAll();
    const rowsByPlatform = new Map(rows.map((row) => [row.platform, row]));

    return ALL_PLATFORMS.map((platform) => {
      const row = rowsByPlatform.get(platform);
      const isConfigured = socialFactory.isRealProviderConfigured(platform);

      if (!row) {
        return {
          platform,
          status: "disconnected",
          account_name: null,
          avatar_url: null,
          scopes: [],
          connected_at: null,
          is_configured: isConfigured,
        };
      }

      return {
        platform: row.platform,
        status: row.status,
        account_name: row.account_name,
        avatar_url: row.avatar_url,
        scopes: row.scopes,
        connected_at: row.connected_at,
        is_configured: isConfigured,
      };
    });
  }

  /** Disconnect a platform — best-effort revoke at the provider, then clear tokens locally. */
  async disconnect(platform: SocialPlatform): Promise<void> {
    const accessToken = await socialRepository.getDecryptedAccessToken(platform);
    const provider = socialFactory.getProvider(platform);

    if (accessToken && provider.revoke) {
      try {
        await provider.revoke(accessToken);
      } catch (err) {
        console.error(`Failed to revoke ${platform} token at the provider (continuing):`, err);
      }
    }

    await socialRepository.disconnect(platform);
  }
}

export const socialService = new SocialService();

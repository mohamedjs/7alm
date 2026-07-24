import type { ISocialProvider } from "../social.interface";
import type {
  SocialAccountInfo,
  SocialTokenResult,
} from "@/features/shared/types";

const AUTH_BASE = "https://www.tiktok.com/v2/auth/authorize";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const USER_INFO_URL = "https://open.tiktokapis.com/v2/user/info/";
const SCOPES = ["user.info.basic"];

/** Env reads are always lazy (inside functions), never at module import. */
function getCredentials(): { clientKey: string; clientSecret: string } {
  return {
    clientKey: process.env.TIKTOK_CLIENT_ID || "",
    clientSecret: process.env.TIKTOK_CLIENT_SECRET || "",
  };
}

/**
 * TikTok OAuth provider (TikTok for Developers — Login Kit v2).
 * Real endpoints are always coded; `isConfigured` gates whether the factory
 * actually selects this provider over the mock connector.
 */
export class TiktokProvider implements ISocialProvider {
  readonly platform = "tiktok" as const;

  get isConfigured(): boolean {
    const { clientKey, clientSecret } = getCredentials();
    return Boolean(clientKey && clientSecret);
  }

  getAuthUrl(state: string, redirectUri: string): string {
    const { clientKey } = getCredentials();
    const params = new URLSearchParams({
      client_key: clientKey,
      redirect_uri: redirectUri,
      state,
      scope: SCOPES.join(","),
      response_type: "code",
    });
    return `${AUTH_BASE}?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<SocialTokenResult> {
    const { clientKey, clientSecret } = getCredentials();
    const body = new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    });

    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data?.error_description || data?.error || `TikTok token exchange failed (${response.status})`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      scopes: (data.scope || SCOPES.join(",")).split(","),
    };
  }

  async getAccountInfo(accessToken: string): Promise<SocialAccountInfo> {
    const params = new URLSearchParams({
      fields: "open_id,display_name,avatar_url",
    });

    const response = await fetch(`${USER_INFO_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();

    if (!response.ok || data.error?.code !== "ok") {
      throw new Error(data?.error?.message || `TikTok account info fetch failed (${response.status})`);
    }

    const user = data.data?.user;
    return {
      accountId: user.open_id,
      accountName: user.display_name,
      avatarUrl: user.avatar_url,
    };
  }

  async revoke(accessToken: string): Promise<void> {
    const { clientKey, clientSecret } = getCredentials();
    const body = new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      token: accessToken,
    });

    await fetch("https://open.tiktokapis.com/v2/oauth/revoke/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  }
}

import type { ISocialProvider } from "../social.interface";
import type {
  SocialAccountInfo,
  SocialTokenResult,
} from "@/features/shared/types";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const AUTH_BASE = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;
const SCOPES = ["pages_show_list", "pages_read_engagement", "business_management"];

/** Env reads are always lazy (inside functions), never at module import. */
function getCredentials(): { appId: string; appSecret: string } {
  return {
    appId: process.env.FACEBOOK_APP_ID || "",
    appSecret: process.env.FACEBOOK_APP_SECRET || "",
  };
}

/**
 * Facebook OAuth provider (Meta Graph API — Facebook Login for Business).
 * Real endpoints are always coded; `isConfigured` gates whether the factory
 * actually selects this provider over the mock connector.
 */
export class FacebookProvider implements ISocialProvider {
  readonly platform = "facebook" as const;

  get isConfigured(): boolean {
    const { appId, appSecret } = getCredentials();
    return Boolean(appId && appSecret);
  }

  getAuthUrl(state: string, redirectUri: string): string {
    const { appId } = getCredentials();
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      state,
      scope: SCOPES.join(","),
      response_type: "code",
    });
    return `${AUTH_BASE}?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<SocialTokenResult> {
    const { appId, appSecret } = getCredentials();
    const params = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code,
    });

    const response = await fetch(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || `Facebook token exchange failed (${response.status})`);
    }

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      scopes: SCOPES,
    };
  }

  async getAccountInfo(accessToken: string): Promise<SocialAccountInfo> {
    const params = new URLSearchParams({
      fields: "id,name,picture",
      access_token: accessToken,
    });

    const response = await fetch(`${GRAPH_BASE}/me?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || `Facebook account info fetch failed (${response.status})`);
    }

    return {
      accountId: data.id,
      accountName: data.name,
      avatarUrl: data.picture?.data?.url,
    };
  }

  async revoke(accessToken: string): Promise<void> {
    const params = new URLSearchParams({ access_token: accessToken });
    await fetch(`${GRAPH_BASE}/me/permissions?${params.toString()}`, {
      method: "DELETE",
    });
  }
}

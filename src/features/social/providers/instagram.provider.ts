import type { ISocialProvider } from "../social.interface";
import type {
  SocialAccountInfo,
  SocialTokenResult,
} from "@/features/shared/types";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const AUTH_BASE = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;
// Instagram business accounts are connected via Facebook Login for Business —
// the same Graph OAuth dialog, scoped to Instagram + the linked Page.
const SCOPES = ["instagram_basic", "instagram_manage_insights", "pages_show_list"];

/** Env reads are always lazy (inside functions), never at module import. */
function getCredentials(): { appId: string; appSecret: string } {
  return {
    appId: process.env.INSTAGRAM_APP_ID || "",
    appSecret: process.env.INSTAGRAM_APP_SECRET || "",
  };
}

/**
 * Instagram OAuth provider (Meta Graph API, Instagram Graph via a linked Page).
 * Real endpoints are always coded; `isConfigured` gates whether the factory
 * actually selects this provider over the mock connector.
 */
export class InstagramProvider implements ISocialProvider {
  readonly platform = "instagram" as const;

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
      throw new Error(data?.error?.message || `Instagram token exchange failed (${response.status})`);
    }

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      scopes: SCOPES,
    };
  }

  async getAccountInfo(accessToken: string): Promise<SocialAccountInfo> {
    // Resolve the Page(s) tied to this user token, then the linked IG business account.
    const pagesParams = new URLSearchParams({
      fields: "instagram_business_account{id,username,profile_picture_url}",
      access_token: accessToken,
    });

    const response = await fetch(`${GRAPH_BASE}/me/accounts?${pagesParams.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || `Instagram account info fetch failed (${response.status})`);
    }

    const igAccount = data?.data?.[0]?.instagram_business_account;
    if (!igAccount) {
      throw new Error("No Instagram business account linked to this Facebook Page.");
    }

    return {
      accountId: igAccount.id,
      accountName: igAccount.username,
      avatarUrl: igAccount.profile_picture_url,
    };
  }

  async revoke(accessToken: string): Promise<void> {
    const params = new URLSearchParams({ access_token: accessToken });
    await fetch(`${GRAPH_BASE}/me/permissions?${params.toString()}`, {
      method: "DELETE",
    });
  }
}

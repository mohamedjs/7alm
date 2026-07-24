import type { ISocialProvider } from "../social.interface";
import type {
  SocialAccountInfo,
  SocialTokenResult,
} from "@/features/shared/types";

/**
 * WhatsApp here = the official WhatsApp Cloud API (Meta) OAuth — a
 * connect/status-only integration, completely separate from the existing
 * Evolution API / n8n WhatsApp CRM integration
 * (`src/features/whatsapp/n8n-whatsapp.service.ts`). Do not conflate them.
 */
const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const AUTH_BASE = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;
const SCOPES = ["whatsapp_business_management", "whatsapp_business_messaging", "business_management"];

/** Env reads are always lazy (inside functions), never at module import. */
function getCredentials(): { appId: string; appSecret: string } {
  return {
    appId: process.env.WHATSAPP_APP_ID || "",
    appSecret: process.env.WHATSAPP_APP_SECRET || "",
  };
}

/**
 * WhatsApp Cloud API OAuth provider (Meta Embedded Signup / Graph OAuth).
 * Real endpoints are always coded; `isConfigured` gates whether the factory
 * actually selects this provider over the mock connector.
 */
export class WhatsappProvider implements ISocialProvider {
  readonly platform = "whatsapp" as const;

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
      throw new Error(data?.error?.message || `WhatsApp token exchange failed (${response.status})`);
    }

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      scopes: SCOPES,
    };
  }

  async getAccountInfo(accessToken: string): Promise<SocialAccountInfo> {
    // Resolve the WhatsApp Business Account(s) tied to the granted business.
    const params = new URLSearchParams({
      fields: "id,name",
      access_token: accessToken,
    });

    const response = await fetch(`${GRAPH_BASE}/me/businesses?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || `WhatsApp account info fetch failed (${response.status})`);
    }

    const business = data?.data?.[0];
    if (!business) {
      throw new Error("No WhatsApp Business Account found for this connection.");
    }

    return {
      accountId: business.id,
      accountName: business.name,
    };
  }

  async revoke(accessToken: string): Promise<void> {
    const params = new URLSearchParams({ access_token: accessToken });
    await fetch(`${GRAPH_BASE}/me/permissions?${params.toString()}`, {
      method: "DELETE",
    });
  }
}

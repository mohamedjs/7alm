import { Logger } from "@nestjs/common";
import type { Env } from "../../../shared/infrastructure/config/env";
import type { AccountInfo, SocialPlatform, SocialProvider, TokenResult } from "../domain/social";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

async function getJson(url: string, init?: RequestInit): Promise<Json> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) });
  const data = (await res.json().catch(() => ({}))) as Json;
  if (!res.ok || data.error) throw new Error(data?.error?.message ?? data?.error_description ?? `HTTP ${res.status}`);
  return data;
}

/** Permissions the inbox needs (Messenger, Page comments, IG DMs + comments). */
export const META_PAGE_SCOPES = [
  "pages_show_list",
  "pages_messaging",
  "pages_manage_metadata",
  "pages_read_engagement",
  "pages_manage_engagement",
  "instagram_basic",
  "instagram_manage_messages",
  "instagram_manage_comments",
  "business_management",
];
export const WHATSAPP_SCOPES = ["whatsapp_business_management", "whatsapp_business_messaging", "business_management"];

/**
 * Facebook Login for Business. One login yields the Page token used for
 * Messenger and Page comments, plus the Instagram business account linked to
 * the Page (IG DMs + comments go through the same Page token).
 */
export class MetaPageProvider implements SocialProvider {
  private readonly log = new Logger("MetaPageProvider");
  constructor(
    readonly platform: "facebook" | "instagram",
    private readonly env: Env,
  ) {}

  private get graph() {
    return `https://graph.facebook.com/${this.env.META_GRAPH_VERSION}`;
  }
  private get app() {
    return this.platform === "instagram"
      ? { id: this.env.INSTAGRAM_APP_ID ?? this.env.FACEBOOK_APP_ID, secret: this.env.INSTAGRAM_APP_SECRET ?? this.env.FACEBOOK_APP_SECRET }
      : { id: this.env.FACEBOOK_APP_ID, secret: this.env.FACEBOOK_APP_SECRET };
  }
  get isConfigured() {
    return Boolean(this.app.id && this.app.secret);
  }

  authUrl(state: string, redirectUri: string) {
    const q = new URLSearchParams({ client_id: this.app.id ?? "", redirect_uri: redirectUri, state, scope: META_PAGE_SCOPES.join(","), response_type: "code" });
    return `https://www.facebook.com/${this.env.META_GRAPH_VERSION}/dialog/oauth?${q}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<TokenResult> {
    const short = await getJson(`${this.graph}/oauth/access_token?${new URLSearchParams({ client_id: this.app.id!, client_secret: this.app.secret!, redirect_uri: redirectUri, code })}`);
    // Long-lived user token → Page tokens derived from it do not expire.
    const long = await getJson(
      `${this.graph}/oauth/access_token?${new URLSearchParams({ grant_type: "fb_exchange_token", client_id: this.app.id!, client_secret: this.app.secret!, fb_exchange_token: short.access_token })}`,
    );
    return { accessToken: long.access_token, expiresIn: long.expires_in, scopes: META_PAGE_SCOPES };
  }

  async accountInfo(token: TokenResult): Promise<AccountInfo> {
    const pages = await getJson(`${this.graph}/me/accounts?${new URLSearchParams({ fields: "id,name,access_token,picture{url},instagram_business_account{id,username}", access_token: token.accessToken })}`);
    const list: Json[] = pages.data ?? [];
    const page = list.find((p) => p.id === this.env.META_PAGE_ID) ?? list[0];
    if (!page) throw new Error("No Facebook Page was granted. Pick at least one Page in the Facebook dialog.");
    const ig = page.instagram_business_account;
    if (this.platform === "instagram" && !ig) throw new Error(`Page "${page.name}" has no linked Instagram professional account.`);
    return {
      accountId: this.platform === "instagram" ? ig.id : page.id,
      accountName: this.platform === "instagram" ? `@${ig.username ?? ig.id}` : page.name,
      avatarUrl: page.picture?.data?.url,
      storedToken: page.access_token,
      metadata: { page_id: page.id, page_name: page.name, instagram_account_id: ig?.id ?? null, instagram_username: ig?.username ?? null, pages_granted: list.length },
    };
  }

  async afterConnect(info: AccountInfo, pageToken: string) {
    const pageId = info.metadata?.page_id as string;
    const q = new URLSearchParams({ subscribed_fields: "messages,messaging_postbacks,message_echoes,message_deliveries,message_reads,feed", access_token: pageToken });
    await getJson(`${this.graph}/${pageId}/subscribed_apps?${q}`, { method: "POST" });
    this.log.log(`page ${pageId} subscribed to webhooks`);
  }

  async revoke(accessToken: string) {
    await fetch(`${this.graph}/me/permissions?access_token=${encodeURIComponent(accessToken)}`, { method: "DELETE" }).catch(() => undefined);
  }
}

/** WhatsApp Cloud API: finds the WABA and its first phone number, then subscribes the app to the WABA. */
export class WhatsAppProvider implements SocialProvider {
  readonly platform = "whatsapp" as const;
  constructor(private readonly env: Env) {}

  private get graph() {
    return `https://graph.facebook.com/${this.env.META_GRAPH_VERSION}`;
  }
  private get app() {
    return { id: this.env.WHATSAPP_APP_ID ?? this.env.FACEBOOK_APP_ID, secret: this.env.WHATSAPP_APP_SECRET ?? this.env.FACEBOOK_APP_SECRET };
  }
  get isConfigured() {
    return Boolean(this.app.id && this.app.secret);
  }

  authUrl(state: string, redirectUri: string) {
    const q = new URLSearchParams({ client_id: this.app.id ?? "", redirect_uri: redirectUri, state, scope: WHATSAPP_SCOPES.join(","), response_type: "code" });
    return `https://www.facebook.com/${this.env.META_GRAPH_VERSION}/dialog/oauth?${q}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<TokenResult> {
    const short = await getJson(`${this.graph}/oauth/access_token?${new URLSearchParams({ client_id: this.app.id!, client_secret: this.app.secret!, redirect_uri: redirectUri, code })}`);
    const long = await getJson(
      `${this.graph}/oauth/access_token?${new URLSearchParams({ grant_type: "fb_exchange_token", client_id: this.app.id!, client_secret: this.app.secret!, fb_exchange_token: short.access_token })}`,
    );
    return { accessToken: long.access_token, expiresIn: long.expires_in, scopes: WHATSAPP_SCOPES };
  }

  async accountInfo(token: TokenResult): Promise<AccountInfo> {
    const t = encodeURIComponent(token.accessToken);
    const businesses = await getJson(`${this.graph}/me/businesses?fields=id,name&access_token=${t}`);
    const business = businesses.data?.[0];
    if (!business) throw new Error("No Meta business found for this login.");
    const wabas = await getJson(`${this.graph}/${business.id}/owned_whatsapp_business_accounts?fields=id,name&access_token=${t}`);
    const waba = wabas.data?.[0];
    if (!waba) throw new Error("No WhatsApp Business Account found.");
    const phones = await getJson(`${this.graph}/${waba.id}/phone_numbers?fields=id,display_phone_number,verified_name&access_token=${t}`);
    const phone = phones.data?.[0];
    if (!phone) throw new Error("The WhatsApp Business Account has no phone number yet.");
    return {
      accountId: waba.id,
      accountName: `${phone.verified_name ?? waba.name} (${phone.display_phone_number})`,
      metadata: { business_id: business.id, waba_id: waba.id, phone_number_id: phone.id, display_phone_number: phone.display_phone_number },
    };
  }

  async afterConnect(info: AccountInfo, token: string) {
    await getJson(`${this.graph}/${info.metadata?.waba_id}/subscribed_apps?access_token=${encodeURIComponent(token)}`, { method: "POST" });
  }
}

export class TikTokProvider implements SocialProvider {
  readonly platform = "tiktok" as const;
  constructor(private readonly env: Env) {}
  get isConfigured() {
    return Boolean(this.env.TIKTOK_CLIENT_ID && this.env.TIKTOK_CLIENT_SECRET);
  }
  authUrl(state: string, redirectUri: string) {
    const q = new URLSearchParams({ client_key: this.env.TIKTOK_CLIENT_ID ?? "", scope: "user.info.basic", response_type: "code", redirect_uri: redirectUri, state });
    return `https://www.tiktok.com/v2/auth/authorize/?${q}`;
  }
  async exchangeCode(code: string, redirectUri: string): Promise<TokenResult> {
    const data = await getJson("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_key: this.env.TIKTOK_CLIENT_ID!, client_secret: this.env.TIKTOK_CLIENT_SECRET!, code, grant_type: "authorization_code", redirect_uri: redirectUri }),
    });
    return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in, scopes: String(data.scope ?? "user.info.basic").split(",") };
  }
  async accountInfo(token: TokenResult): Promise<AccountInfo> {
    const data = await getJson("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url", { headers: { Authorization: `Bearer ${token.accessToken}` } });
    const u = data.data?.user ?? {};
    return { accountId: u.open_id, accountName: u.display_name ?? "TikTok", avatarUrl: u.avatar_url };
  }
  async revoke(accessToken: string) {
    await fetch("https://open.tiktokapis.com/v2/oauth/revoke/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_key: this.env.TIKTOK_CLIENT_ID ?? "", client_secret: this.env.TIKTOK_CLIENT_SECRET ?? "", token: accessToken }),
    }).catch(() => undefined);
  }
}

/** Demo connector: completes the OAuth round-trip locally without real credentials. */
export class MockProvider implements SocialProvider {
  readonly isConfigured = false;
  constructor(
    readonly platform: SocialPlatform,
    private readonly env: Env,
  ) {}
  authUrl(state: string) {
    return `${this.env.SOCIAL_OAUTH_REDIRECT_BASE}/api/connections/${this.platform}/callback?${new URLSearchParams({ code: "mock", state })}`;
  }
  async exchangeCode(): Promise<TokenResult> {
    return { accessToken: `mock_access_token_${this.platform}_${Date.now()}`, expiresIn: 60 * 86400, scopes: ["mock_scope"] };
  }
  async accountInfo(): Promise<AccountInfo> {
    return { accountId: `mock_${this.platform}_id`, accountName: `@7alm_demo_${this.platform}`, avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${this.platform}`, metadata: { demo: true } };
  }
}

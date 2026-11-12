import { Inject, Injectable, Logger } from "@nestjs/common";
import { ENV } from "../../../shared/infrastructure/config/config.module";
import type { Env } from "../../../shared/infrastructure/config/env";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import { CryptoService } from "../../../shared/infrastructure/security/crypto.service";

export interface PageCredentials {
  pageId: string;
  pageToken: string;
  instagramAccountId?: string;
}

export interface InstagramCredentials {
  igId: string;
  token: string;
  /** graph.instagram.com for Instagram-issued tokens (IG...), graph.facebook.com for Page/Business tokens. */
  host: string;
}

export interface WhatsAppCredentials {
  phoneNumberId: string;
  token: string;
}

/**
 * Where Graph tokens come from: explicit env vars first (simplest for one
 * store), else the encrypted tokens saved by the admin "Connect Facebook /
 * WhatsApp" OAuth flow (social module).
 */
@Injectable()
export class MetaCredentials {
  private readonly log = new Logger(MetaCredentials.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  get graphVersion() {
    return this.env.META_GRAPH_VERSION;
  }

  async page(): Promise<PageCredentials | null> {
    if (this.env.META_PAGE_ID && this.env.META_PAGE_ACCESS_TOKEN) {
      return { pageId: this.env.META_PAGE_ID, pageToken: this.env.META_PAGE_ACCESS_TOKEN, instagramAccountId: this.env.META_IG_ACCOUNT_ID };
    }
    const row = await this.prisma.socialConnection.findUnique({ where: { platform: "facebook" } });
    const meta = (row?.metadata ?? {}) as Record<string, unknown>;
    if (row?.status !== "connected" || !row.access_token || typeof meta.page_id !== "string") return null;
    try {
      return {
        pageId: meta.page_id,
        pageToken: this.crypto.decrypt(row.access_token),
        instagramAccountId: (meta.instagram_account_id as string | undefined) ?? this.env.META_IG_ACCOUNT_ID,
      };
    } catch (e) {
      this.log.error(`cannot decrypt facebook page token: ${e instanceof Error ? e.message : e}`);
      return null;
    }
  }

  /**
   * Instagram creds: a dedicated Instagram token (Unified login) wins; else
   * the Page token, when the IG account is linked to the connected Page.
   */
  async instagram(): Promise<InstagramCredentials | null> {
    const token = this.env.META_IG_ACCESS_TOKEN;
    if (token) {
      const host = /^IG/.test(token) ? "graph.instagram.com" : "graph.facebook.com";
      const igId = this.env.META_IG_ACCOUNT_ID ?? (await this.resolveIgId(host, token));
      if (igId) return { igId, token, host };
    }
    const page = await this.page();
    if (page?.instagramAccountId) return { igId: page.instagramAccountId, token: page.pageToken, host: "graph.facebook.com" };
    return null;
  }

  private igIdCache?: string;
  private async resolveIgId(host: string, token: string): Promise<string | undefined> {
    if (this.igIdCache) return this.igIdCache;
    try {
      const res = await fetch(`https://${host}/${this.env.META_GRAPH_VERSION}/me?fields=user_id,id,username`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15_000),
      });
      const me = (await res.json()) as { user_id?: string | number; id?: string };
      this.igIdCache = me.user_id ? String(me.user_id) : me.id;
      return this.igIdCache;
    } catch (e) {
      this.log.warn(`could not resolve Instagram account id: ${e instanceof Error ? e.message : e}`);
      return undefined;
    }
  }

  async whatsapp(): Promise<WhatsAppCredentials | null> {
    if (this.env.META_WHATSAPP_PHONE_NUMBER_ID && this.env.META_WHATSAPP_TOKEN) {
      return { phoneNumberId: this.env.META_WHATSAPP_PHONE_NUMBER_ID, token: this.env.META_WHATSAPP_TOKEN };
    }
    const row = await this.prisma.socialConnection.findUnique({ where: { platform: "whatsapp" } });
    const meta = (row?.metadata ?? {}) as Record<string, unknown>;
    if (row?.status !== "connected" || !row.access_token || typeof meta.phone_number_id !== "string") return null;
    try {
      return { phoneNumberId: meta.phone_number_id, token: this.crypto.decrypt(row.access_token) };
    } catch {
      return null;
    }
  }

  get whatsappTemplate() {
    return this.env.META_WHATSAPP_FALLBACK_TEMPLATE;
  }

  get whatsappTemplateLang() {
    return this.env.META_WHATSAPP_TEMPLATE_LANG;
  }
}

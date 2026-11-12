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

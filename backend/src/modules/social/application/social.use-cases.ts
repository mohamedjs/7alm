import crypto from "node:crypto";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { DomainError } from "../../../shared/domain/domain-error";
import { ENV } from "../../../shared/infrastructure/config/config.module";
import type { Env } from "../../../shared/infrastructure/config/env";
import { ALL_PLATFORMS, signState, STATE_TTL_MS, verifyState, type SocialPlatform, type SocialProvider } from "../domain/social";
import { MetaPageProvider, MockProvider, TikTokProvider, WhatsAppProvider } from "../infrastructure/social.providers";
import { SocialRepository } from "../infrastructure/social.repository";

@Injectable()
export class SocialConnections {
  private readonly log = new Logger(SocialConnections.name);
  private readonly real: Map<SocialPlatform, SocialProvider>;

  constructor(
    private readonly repo: SocialRepository,
    @Inject(ENV) private readonly env: Env,
  ) {
    this.real = new Map<SocialPlatform, SocialProvider>([
      ["facebook", new MetaPageProvider("facebook", env)],
      ["instagram", new MetaPageProvider("instagram", env)],
      ["tiktok", new TikTokProvider(env)],
      ["whatsapp", new WhatsAppProvider(env)],
    ]);
  }

  /** Factory: the real provider only when its app credentials exist and mock mode is off. */
  private provider(platform: SocialPlatform): SocialProvider {
    const real = this.real.get(platform)!;
    return real.isConfigured && !this.env.SOCIAL_MOCK_MODE ? real : new MockProvider(platform, this.env);
  }

  private secret() {
    const s = this.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
    if (!s) throw DomainError.unavailable("SOCIAL_TOKEN_ENCRYPTION_KEY is not set");
    return s;
  }

  callbackUrl(platform: SocialPlatform) {
    return `${this.env.SOCIAL_OAUTH_REDIRECT_BASE}/api/connections/${platform}/callback`;
  }

  get adminRedirect() {
    return `${this.env.SOCIAL_OAUTH_REDIRECT_BASE}/admin/connections`;
  }

  start(platform: SocialPlatform, adminId: string | null) {
    const state = signState({ platform, adminId, nonce: crypto.randomBytes(16).toString("hex"), exp: Date.now() + STATE_TTL_MS }, this.secret());
    return { authUrl: this.provider(platform).authUrl(state, this.callbackUrl(platform)), state };
  }

  async complete(platform: SocialPlatform, code: string, state: string) {
    const payload = verifyState(state, platform, this.secret());
    const provider = this.provider(platform);
    const token = await provider.exchangeCode(code, this.callbackUrl(platform));
    const info = await provider.accountInfo(token);
    const stored = info.storedToken ?? token.accessToken;
    await this.repo.save({
      platform,
      accountId: info.accountId,
      accountName: info.accountName,
      avatarUrl: info.avatarUrl ?? null,
      accessToken: stored,
      refreshToken: token.refreshToken ?? null,
      // A Page token derived from a long-lived user token does not expire.
      tokenExpiresAt: info.storedToken ? null : token.expiresIn ? new Date(Date.now() + token.expiresIn * 1000) : null,
      scopes: token.scopes ?? [],
      connectedBy: payload.adminId,
      metadata: info.metadata ?? {},
    });
    if (provider.afterConnect) {
      try {
        await provider.afterConnect(info, stored);
      } catch (e) {
        const msg = `Connected, but webhook subscription failed: ${e instanceof Error ? e.message : e}`;
        this.log.warn(msg);
        await this.repo.markError(platform, msg);
      }
    }
  }

  async list() {
    const rows = new Map((await this.repo.all()).map((r) => [r.platform, r]));
    return ALL_PLATFORMS.map((platform) => {
      const r = rows.get(platform);
      const is_configured = this.real.get(platform)!.isConfigured;
      return r
        ? { platform, status: r.status, account_name: r.account_name, avatar_url: r.avatar_url, scopes: r.scopes, connected_at: r.connected_at, is_configured, error_message: r.error_message }
        : { platform, status: "disconnected", account_name: null, avatar_url: null, scopes: [], connected_at: null, is_configured, error_message: null };
    });
  }

  async disconnect(platform: SocialPlatform) {
    const token = await this.repo.decryptedToken(platform);
    const provider = this.provider(platform);
    if (token && provider.revoke) await provider.revoke(token).catch(() => undefined);
    await this.repo.disconnect(platform);
  }
}

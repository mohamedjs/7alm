import type { ISocialProvider } from "../social.interface";
import type {
  SocialAccountInfo,
  SocialPlatform,
  SocialTokenResult,
} from "@/features/shared/types";

/**
 * Mock Social Provider — one instance bound per platform.
 *
 * Loops the OAuth "authorize" step straight back to our own public callback
 * (`{redirectBase}/api/connections/{platform}/callback?code=mock&state=...`)
 * with zero external calls, so the full "connect accounts" demo works
 * end-to-end with no real developer app credentials (`SOCIAL_MOCK_MODE=1`).
 *
 * Selected by `social.factory.ts` whenever the real provider for a platform
 * is not configured, or `SOCIAL_MOCK_MODE=1` forces mock mode globally.
 */
export class MockSocialProvider implements ISocialProvider {
  constructor(readonly platform: SocialPlatform) {}

  /** Mock is never "configured" — it never talks to a real provider. */
  readonly isConfigured = false;

  /** Read lazily (never at module import) — mirrors every other provider. */
  private getRedirectBase(): string {
    return process.env.SOCIAL_OAUTH_REDIRECT_BASE || "http://localhost:3000";
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({ code: "mock", state });
    return `${this.getRedirectBase()}/api/connections/${this.platform}/callback?${params.toString()}`;
  }

  async exchangeCode(): Promise<SocialTokenResult> {
    return {
      accessToken: `mock_access_token_${this.platform}_${Date.now()}`,
      refreshToken: `mock_refresh_token_${this.platform}`,
      expiresIn: 60 * 60 * 24 * 60, // 60 days — matches Meta long-lived tokens
      scopes: ["mock_scope"],
    };
  }

  async getAccountInfo(): Promise<SocialAccountInfo> {
    return {
      accountId: `mock_${this.platform}_id`,
      accountName: `@7alm_demo_${this.platform}`,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${this.platform}`,
      metadata: { demo: true },
    };
  }

  async revoke(): Promise<void> {
    // No-op — nothing to revoke against a real provider in mock mode.
  }
}

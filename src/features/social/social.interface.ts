import type {
  SocialAccountInfo,
  SocialPlatform,
  SocialTokenResult,
} from "@/features/shared/types";

/**
 * Abstract Social Platform Provider Interface.
 * All social OAuth providers (Facebook, Instagram, TikTok, WhatsApp Cloud
 * API, and the demo Mock provider) implement this contract. Mirrors
 * `IShippingProvider` (see `src/features/shipping/shipping.interface.ts`)
 * for the Factory Pattern used by `social.factory.ts`.
 */
export interface ISocialProvider {
  /** Platform this provider instance handles. */
  readonly platform: SocialPlatform;

  /**
   * True when real OAuth app credentials (app id/secret or equivalent) are
   * present in env for this platform. Does NOT factor in `SOCIAL_MOCK_MODE`
   * — the factory decides real-vs-mock selection using this flag plus the
   * mock-mode env var.
   */
  readonly isConfigured: boolean;

  /** Build the provider's OAuth authorize URL the admin is redirected to. */
  getAuthUrl(state: string, redirectUri: string): string;

  /** Exchange an OAuth authorization code for an access token. */
  exchangeCode(code: string, redirectUri: string): Promise<SocialTokenResult>;

  /** Fetch the connected account's public info (id/handle/avatar). */
  getAccountInfo(accessToken: string): Promise<SocialAccountInfo>;

  /** Refresh an expired access token, if the platform supports it. */
  refreshToken?(refreshToken: string): Promise<SocialTokenResult>;

  /** Revoke the connection at the provider, best-effort. */
  revoke?(accessToken: string): Promise<void>;
}

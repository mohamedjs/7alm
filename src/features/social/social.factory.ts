import type { ISocialProvider } from "./social.interface";
import type { SocialPlatform } from "@/features/shared/types";
import { FacebookProvider } from "./providers/facebook.provider";
import { InstagramProvider } from "./providers/instagram.provider";
import { TiktokProvider } from "./providers/tiktok.provider";
import { WhatsappProvider } from "./providers/whatsapp.provider";
import { MockSocialProvider } from "./providers/mock.provider";

/**
 * Social Factory — Factory Pattern for social platform OAuth providers.
 * Mirrors `shippingFactory` (`src/features/shipping/shipping.factory.ts`):
 * a singleton that resolves to a concrete provider per platform.
 *
 * `getProvider(platform)` returns the real OAuth implementation when its
 * app credentials are configured AND `SOCIAL_MOCK_MODE !== '1'`; otherwise
 * it returns the mock connector for that platform so the "connect
 * accounts" demo works end-to-end with zero real developer app
 * credentials.
 *
 * To add a new provider:
 *   1. Create a new class implementing ISocialProvider
 *   2. Register it in the `realProviders` map below
 *   3. Add the platform name to SocialPlatform in shared/types.ts
 */
class SocialFactory {
  private realProviders: Map<SocialPlatform, ISocialProvider>;
  private mockProviders: Map<SocialPlatform, ISocialProvider>;

  constructor() {
    this.realProviders = new Map<SocialPlatform, ISocialProvider>([
      ["facebook", new FacebookProvider()],
      ["instagram", new InstagramProvider()],
      ["tiktok", new TiktokProvider()],
      ["whatsapp", new WhatsappProvider()],
    ]);

    this.mockProviders = new Map<SocialPlatform, ISocialProvider>([
      ["facebook", new MockSocialProvider("facebook")],
      ["instagram", new MockSocialProvider("instagram")],
      ["tiktok", new MockSocialProvider("tiktok")],
      ["whatsapp", new MockSocialProvider("whatsapp")],
    ]);
  }

  /** True when SOCIAL_MOCK_MODE forces the mock connector for every platform. */
  private isMockModeForced(): boolean {
    return process.env.SOCIAL_MOCK_MODE === "1";
  }

  /**
   * Get the provider for a platform — the real OAuth implementation when
   * configured (and mock mode isn't forced), otherwise the mock connector.
   */
  getProvider(platform: SocialPlatform): ISocialProvider {
    const real = this.realProviders.get(platform);
    if (real && real.isConfigured && !this.isMockModeForced()) {
      return real;
    }
    return this.mockProviders.get(platform)!;
  }

  /**
   * Whether real credentials exist for a platform, independent of
   * SOCIAL_MOCK_MODE. Used for the `is_configured` flag surfaced to the
   * admin UI (shows a "demo mode" hint when false).
   */
  isRealProviderConfigured(platform: SocialPlatform): boolean {
    return this.realProviders.get(platform)?.isConfigured ?? false;
  }

  /** List all supported platform keys. */
  getAvailablePlatforms(): SocialPlatform[] {
    return Array.from(this.realProviders.keys());
  }
}

// Singleton instance
export const socialFactory = new SocialFactory();

const VALID_PLATFORMS: readonly SocialPlatform[] = ["facebook", "instagram", "tiktok", "whatsapp"];

/** Runtime guard for the `platform` route param — shared by all `/connections/[platform]/*` routes. */
export function isSocialPlatform(value: string): value is SocialPlatform {
  return (VALID_PLATFORMS as readonly string[]).includes(value);
}

import { supabase } from "@/lib/supabase";
import { encrypt, decrypt } from "@/lib/crypto";
import type {
  SocialConnection,
  SocialConnectionStatus,
  SocialPlatform,
} from "@/features/shared/types";

export interface UpsertConnectionInput {
  platform: SocialPlatform;
  accountId: string;
  accountName: string;
  avatarUrl?: string | null;
  accessToken: string;
  refreshToken?: string | null;
  /** ISO timestamp, or null if the provider didn't return an expiry. */
  tokenExpiresAt?: string | null;
  scopes?: string[];
  connectedBy: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Repository for the `social_connections` table.
 * The only file that touches Supabase for this domain. Access/refresh
 * tokens are encrypted here on write and decrypted here on read — callers
 * (the service layer) never see raw ciphertext or handle crypto directly.
 */
export class SocialRepository {
  /** All rows (server only — access/refresh tokens remain encrypted). */
  async getAll(): Promise<SocialConnection[]> {
    const { data, error } = await supabase.from("social_connections").select("*");

    if (error) {
      console.error("Error fetching social connections:", error);
      throw error;
    }
    return data || [];
  }

  async getByPlatform(platform: SocialPlatform): Promise<SocialConnection | null> {
    const { data, error } = await supabase
      .from("social_connections")
      .select("*")
      .eq("platform", platform)
      .single();

    if (error) {
      if (error.code !== "PGRST116") {
        // not found is expected until a platform is first connected
        console.error("Error fetching social connection:", error);
      }
      return null;
    }
    return data;
  }

  /** Decrypt & return the access token for a platform, or null if not connected. */
  async getDecryptedAccessToken(platform: SocialPlatform): Promise<string | null> {
    const row = await this.getByPlatform(platform);
    if (!row?.access_token) return null;
    return decrypt(row.access_token);
  }

  /**
   * Insert/update the connection row for a platform after a successful
   * OAuth callback. Tokens are encrypted before being written.
   */
  async upsertConnection(input: UpsertConnectionInput): Promise<SocialConnection> {
    const nowIso = new Date().toISOString();

    const payload = {
      platform: input.platform,
      account_id: input.accountId,
      account_name: input.accountName,
      avatar_url: input.avatarUrl ?? null,
      access_token: encrypt(input.accessToken),
      refresh_token: input.refreshToken ? encrypt(input.refreshToken) : null,
      token_expires_at: input.tokenExpiresAt ?? null,
      scopes: input.scopes ?? [],
      status: "connected" satisfies SocialConnectionStatus,
      error_message: null,
      metadata: input.metadata ?? {},
      connected_by: input.connectedBy,
      connected_at: nowIso,
      updated_at: nowIso,
    };

    const { data, error } = await supabase
      .from("social_connections")
      .upsert(payload, { onConflict: "platform" })
      .select()
      .single();

    if (error) {
      console.error("Error upserting social connection:", error);
      throw error;
    }
    return data;
  }

  /** Record a failed connection attempt for observability (best-effort). */
  async markError(platform: SocialPlatform, message: string): Promise<void> {
    const { error } = await supabase.from("social_connections").upsert(
      {
        platform,
        status: "error" satisfies SocialConnectionStatus,
        error_message: message,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "platform" }
    );

    if (error) {
      console.error("Error recording social connection error:", error);
    }
  }

  /**
   * Disconnect: delete the row entirely (spec §7.4 permits either nulling
   * tokens + status='revoked', or deleting the row — we delete so
   * `listConnections()` reports a clean `status: "disconnected"` afterwards,
   * matching the UX flow in §10.5 ("back to Not connected") without the
   * frontend needing to special-case 'revoked' as "not connected" too).
   */
  async disconnect(platform: SocialPlatform): Promise<void> {
    const { error } = await supabase
      .from("social_connections")
      .delete()
      .eq("platform", platform);

    if (error) {
      console.error("Error disconnecting social connection:", error);
      throw error;
    }
  }
}

export const socialRepository = new SocialRepository();

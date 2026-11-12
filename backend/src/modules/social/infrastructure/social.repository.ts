import { Injectable } from "@nestjs/common";
import type { Prisma } from "../../../generated/prisma/client";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import { CryptoService } from "../../../shared/infrastructure/security/crypto.service";
import { iso } from "../../../shared/infrastructure/prisma/decimal";
import type { SocialPlatform } from "../domain/social";

@Injectable()
export class SocialRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async all() {
    const rows = await this.prisma.socialConnection.findMany();
    return rows.map((r) => ({
      platform: r.platform as SocialPlatform,
      status: r.status,
      account_name: r.account_name,
      avatar_url: r.avatar_url,
      scopes: r.scopes,
      connected_at: iso(r.connected_at),
      error_message: r.error_message,
      metadata: r.metadata as Record<string, unknown>,
    }));
  }

  async save(input: {
    platform: SocialPlatform;
    accountId: string;
    accountName: string;
    avatarUrl: string | null;
    accessToken: string;
    refreshToken: string | null;
    tokenExpiresAt: Date | null;
    scopes: string[];
    connectedBy: string | null;
    metadata: Record<string, unknown>;
  }) {
    const data = {
      account_id: input.accountId,
      account_name: input.accountName,
      avatar_url: input.avatarUrl,
      access_token: this.crypto.encrypt(input.accessToken),
      refresh_token: input.refreshToken ? this.crypto.encrypt(input.refreshToken) : null,
      token_expires_at: input.tokenExpiresAt,
      scopes: input.scopes,
      status: "connected",
      error_message: null,
      metadata: input.metadata as Prisma.InputJsonValue,
      connected_by: input.connectedBy,
      connected_at: new Date(),
    };
    await this.prisma.socialConnection.upsert({ where: { platform: input.platform }, update: data, create: { platform: input.platform, ...data } });
  }

  async markError(platform: SocialPlatform, message: string) {
    await this.prisma.socialConnection.updateMany({ where: { platform }, data: { error_message: message.slice(0, 500) } });
  }

  async decryptedToken(platform: SocialPlatform): Promise<string | null> {
    const row = await this.prisma.socialConnection.findUnique({ where: { platform } });
    if (!row?.access_token) return null;
    try {
      return this.crypto.decrypt(row.access_token);
    } catch {
      return null;
    }
  }

  async disconnect(platform: SocialPlatform) {
    await this.prisma.socialConnection.updateMany({
      where: { platform },
      data: { status: "disconnected", access_token: null, refresh_token: null, token_expires_at: null, account_id: null, account_name: null, avatar_url: null, metadata: {}, connected_at: null },
    });
  }
}

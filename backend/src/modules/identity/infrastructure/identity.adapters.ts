import { Inject, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import argon2 from "argon2";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import { ENV } from "../../../shared/infrastructure/config/config.module";
import type { Env } from "../../../shared/infrastructure/config/env";
import { Admin } from "../domain/admin";
import type { AdminRepository, PasswordHasher, TokenClaims, TokenService } from "../domain/ports";

type AdminRow = { id: string; email: string; password_hash: string; full_name: string | null; is_active: boolean };
const toDomain = (r: AdminRow) =>
  Admin.restore({
    id: r.id,
    email: r.email,
    passwordHash: r.password_hash,
    fullName: r.full_name,
    isActive: r.is_active,
  });

@Injectable()
export class PrismaAdminRepository implements AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    const row = await this.prisma.admin.findUnique({ where: { email } });
    return row ? toDomain(row) : null;
  }
  async findById(id: string) {
    const row = await this.prisma.admin.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }
  async create(input: { email: string; passwordHash: string; fullName: string | null }) {
    const row = await this.prisma.admin.create({
      data: { email: input.email, password_hash: input.passwordHash, full_name: input.fullName },
    });
    return toDomain(row);
  }
  async touchLogin(id: string) {
    await this.prisma.admin.update({ where: { id }, data: { last_login_at: new Date() } });
  }
  count() {
    return this.prisma.admin.count();
  }
}

@Injectable()
export class Argon2Hasher implements PasswordHasher {
  hash(plain: string) {
    return argon2.hash(plain, { type: argon2.argon2id });
  }
  async verify(hash: string, plain: string) {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }
}

/** Parses "12h" / "30d" / "900s" / "15m" into seconds. */
export function ttlSeconds(ttl: string): number {
  const m = /^(\d+)([smhd])$/.exec(ttl.trim());
  if (!m) return Number(ttl) || 3600;
  const n = Number(m[1]);
  return n * { s: 1, m: 60, h: 3600, d: 86400 }[m[2] as "s" | "m" | "h" | "d"];
}

@Injectable()
export class JwtTokenService implements TokenService {
  constructor(
    private readonly jwt: JwtService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async issue(claims: Omit<TokenClaims, "typ">) {
    const accessTtl = ttlSeconds(this.env.JWT_ACCESS_TTL);
    const [access, refresh] = await Promise.all([
      this.jwt.signAsync({ ...claims, typ: "access" }, { expiresIn: accessTtl }),
      this.jwt.signAsync({ ...claims, typ: "refresh" }, { expiresIn: ttlSeconds(this.env.JWT_REFRESH_TTL) }),
    ]);
    return { access, refresh, accessTtlSeconds: accessTtl };
  }

  async verify(token: string, typ: TokenClaims["typ"]) {
    try {
      const claims = await this.jwt.verifyAsync<TokenClaims>(token);
      return claims.typ === typ ? claims : null;
    } catch {
      return null;
    }
  }
}

import { Inject, Injectable } from "@nestjs/common";
import { DomainError } from "../../../shared/domain/domain-error";
import { Admin } from "../domain/admin";
import {
  ADMIN_REPOSITORY,
  PASSWORD_HASHER,
  TOKEN_SERVICE,
  type AdminRepository,
  type PasswordHasher,
  type TokenService,
} from "../domain/ports";

export interface SessionDto {
  token: string;
  refresh_token: string;
  expires_in: number;
  user: { id: string; email: string; full_name: string | null };
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly admins: AdminRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
  ) {}

  async execute(email: string, password: string): Promise<SessionDto> {
    const admin = await this.admins.findByEmail(Admin.normaliseEmail(email));
    // Same message for unknown email and wrong password: no account enumeration.
    if (!admin || !(await this.hasher.verify(admin.passwordHash, password))) {
      throw DomainError.unauthorized("Invalid credentials");
    }
    admin.assertCanSignIn();
    await this.admins.touchLogin(admin.id);
    const issued = await this.tokens.issue({ sub: admin.id, email: admin.email });
    return {
      token: issued.access,
      refresh_token: issued.refresh,
      expires_in: issued.accessTtlSeconds,
      user: admin.toPublic(),
    };
  }
}

@Injectable()
export class RefreshSessionUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly admins: AdminRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
  ) {}

  async execute(refreshToken: string): Promise<SessionDto> {
    const claims = await this.tokens.verify(refreshToken, "refresh");
    if (!claims) throw DomainError.unauthorized("Invalid refresh token");
    const admin = await this.admins.findById(claims.sub);
    if (!admin) throw DomainError.unauthorized("Invalid refresh token");
    admin.assertCanSignIn();
    const issued = await this.tokens.issue({ sub: admin.id, email: admin.email });
    return {
      token: issued.access,
      refresh_token: issued.refresh,
      expires_in: issued.accessTtlSeconds,
      user: admin.toPublic(),
    };
  }
}

/** Resolves a bearer token to an active admin — used by the AdminGuard and socket auth. */
@Injectable()
export class AuthenticateAdminUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly admins: AdminRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
  ) {}

  async execute(token: string): Promise<{ id: string; email: string } | null> {
    const claims = await this.tokens.verify(token, "access");
    if (!claims) return null;
    const admin = await this.admins.findById(claims.sub);
    if (!admin) return null;
    try {
      admin.assertCanSignIn();
    } catch {
      return null;
    }
    return { id: admin.id, email: admin.email };
  }
}

/** Creates the first admin from env on boot when the table is empty. */
@Injectable()
export class EnsureSeedAdminUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly admins: AdminRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}

  async execute(email?: string, password?: string, fullName = "Admin"): Promise<"created" | "skipped"> {
    if (!email || !password) return "skipped";
    if ((await this.admins.count()) > 0) return "skipped";
    if (password.length < 12) throw DomainError.validation("ADMIN_SEED_PASSWORD must be at least 12 characters");
    await this.admins.create({
      email: Admin.normaliseEmail(email),
      passwordHash: await this.hasher.hash(password),
      fullName,
    });
    return "created";
  }
}

import { Inject, Logger, Module, OnApplicationBootstrap } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ENV } from "../../shared/infrastructure/config/config.module";
import type { Env } from "../../shared/infrastructure/config/env";
import {
  AuthenticateAdminUseCase,
  EnsureSeedAdminUseCase,
  LoginUseCase,
  RefreshSessionUseCase,
} from "./application/auth.use-cases";
import { ADMIN_REPOSITORY, PASSWORD_HASHER, TOKEN_SERVICE } from "./domain/ports";
import { Argon2Hasher, JwtTokenService, PrismaAdminRepository } from "./infrastructure/identity.adapters";
import { AuthController } from "./presentation/auth.controller";
import { AdminGuard, N8nGuard } from "./presentation/guards";

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({ secret: env.JWT_SECRET, signOptions: { issuer: "7alm" }, verifyOptions: { issuer: "7alm" } }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    { provide: ADMIN_REPOSITORY, useClass: PrismaAdminRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2Hasher },
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
    LoginUseCase,
    RefreshSessionUseCase,
    AuthenticateAdminUseCase,
    EnsureSeedAdminUseCase,
    AdminGuard,
    N8nGuard,
  ],
  exports: [AuthenticateAdminUseCase, AdminGuard, N8nGuard, EnsureSeedAdminUseCase],
})
export class IdentityModule implements OnApplicationBootstrap {
  private readonly log = new Logger(IdentityModule.name);
  constructor(
    private readonly seed: EnsureSeedAdminUseCase,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async onApplicationBootstrap() {
    const result = await this.seed.execute(this.env.ADMIN_SEED_EMAIL, this.env.ADMIN_SEED_PASSWORD);
    if (result === "created") this.log.log(`seeded first admin ${this.env.ADMIN_SEED_EMAIL}`);
  }
}

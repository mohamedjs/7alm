import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthenticateAdminUseCase } from "../application/auth.use-cases";
import { ENV } from "../../../shared/infrastructure/config/config.module";
import type { Env } from "../../../shared/infrastructure/config/env";
import type { AppRequest } from "../../../shared/infrastructure/http/request";
import { safeEqual } from "../../../shared/infrastructure/security/crypto.service";

export const ADMIN_TOKEN_COOKIE = "7alm_admin_token";

export function extractBearer(req: AppRequest): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  const cookie = (req as AppRequest & { cookies?: Record<string, string> }).cookies?.[ADMIN_TOKEN_COOKIE];
  return cookie || null;
}

/** Requires a valid admin access token (Bearer header or the httpOnly cookie). */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly authenticate: AuthenticateAdminUseCase) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AppRequest>();
    const token = extractBearer(req);
    if (!token) throw new UnauthorizedException("Authentication required");
    const admin = await this.authenticate.execute(token);
    if (!admin) throw new ForbiddenException("Invalid token");
    req.admin = admin;
    return true;
  }
}

/** Machine access for n8n workflows: `x-n8n-access-token` must equal N8N_API_ACCESS_TOKEN. */
@Injectable()
export class N8nGuard implements CanActivate {
  constructor(@Inject(ENV) private readonly env: Env) {}

  canActivate(ctx: ExecutionContext): boolean {
    const expected = this.env.N8N_API_ACCESS_TOKEN;
    if (!expected) throw new ServiceUnavailableException("N8N API access is not configured");
    const req = ctx.switchToHttp().getRequest<AppRequest>();
    const provided = req.headers["x-n8n-access-token"];
    if (!provided) throw new UnauthorizedException("Missing n8n access token");
    if (!safeEqual(String(provided), expected)) throw new UnauthorizedException("Invalid n8n access token");
    return true;
  }
}

export const CurrentAdmin = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest<AppRequest>().admin;
});

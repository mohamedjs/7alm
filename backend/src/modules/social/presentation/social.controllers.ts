import { BadRequestException, Controller, Delete, Get, HttpCode, Inject, Param, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { AdminGuard, CurrentAdmin } from "../../identity";
import { ENV } from "../../../shared/infrastructure/config/config.module";
import type { Env } from "../../../shared/infrastructure/config/env";
import { RawResponse } from "../../../shared/infrastructure/http/envelope.interceptor";
import type { AppRequest } from "../../../shared/infrastructure/http/request";
import { SocialConnections } from "../application/social.use-cases";
import { isSocialPlatform, type SocialPlatform } from "../domain/social";

const STATE_COOKIE = "social_oauth_state";

function platformOf(p: string): SocialPlatform {
  if (!isSocialPlatform(p)) throw new BadRequestException("Invalid platform");
  return p;
}

@Controller("admin/connections")
@UseGuards(AdminGuard)
export class ConnectionsAdminController {
  constructor(
    private readonly social: SocialConnections,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Get()
  list() {
    return this.social.list();
  }

  @Post(":platform/authorize")
  @HttpCode(200)
  authorize(@Param("platform") p: string, @CurrentAdmin() admin: AppRequest["admin"], @Res({ passthrough: true }) res: Response) {
    const { authUrl, state } = this.social.start(platformOf(p), admin?.id ?? null);
    res.cookie(STATE_COOKIE, state, { httpOnly: true, sameSite: "lax", secure: this.env.NODE_ENV === "production", path: "/", maxAge: 10 * 60 * 1000 });
    return { authUrl };
  }

  @Delete(":platform")
  async disconnect(@Param("platform") p: string) {
    await this.social.disconnect(platformOf(p));
  }
}

/** OAuth redirect target — always ends in a redirect back to the admin page. */
@Controller("connections")
export class ConnectionsCallbackController {
  constructor(private readonly social: SocialConnections) {}

  @Get(":platform/callback")
  @RawResponse()
  async callback(@Param("platform") p: string, @Query("code") code: string, @Query("state") state: string, @Query("error_description") denied: string | undefined, @Req() req: AppRequest & { cookies?: Record<string, string> }, @Res() res: Response) {
    const back = (q: string) => {
      res.clearCookie(STATE_COOKIE, { path: "/" });
      res.redirect(302, `${this.social.adminRedirect}?${q}`);
    };
    if (!isSocialPlatform(p)) return back("error=invalid_platform");
    if (denied) return back(`error=${encodeURIComponent(denied)}`);
    if (!code || !state) return back("error=missing_code_or_state");
    if (!req.cookies?.[STATE_COOKIE] || req.cookies[STATE_COOKIE] !== state) return back("error=invalid_state");
    try {
      await this.social.complete(p, code, state);
      back(`connected=${p}`);
    } catch (e) {
      back(`error=${encodeURIComponent(e instanceof Error ? e.message : "connect_failed")}`);
    }
  }
}

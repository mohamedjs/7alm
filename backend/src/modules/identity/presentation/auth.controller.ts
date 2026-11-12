import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from "@nestjs/common";
import { SkipThrottle, Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { z } from "zod";
import { Inject } from "@nestjs/common";
import { ZodPipe } from "../../../shared/infrastructure/http/zod.pipe";
import { ENV } from "../../../shared/infrastructure/config/config.module";
import type { Env } from "../../../shared/infrastructure/config/env";
import type { AppRequest } from "../../../shared/infrastructure/http/request";
import { LoginUseCase, RefreshSessionUseCase } from "../application/auth.use-cases";
import { ADMIN_TOKEN_COOKIE, AdminGuard, CurrentAdmin } from "./guards";

const LoginBody = z.object({
  email: z.string({ message: "Email and password are required" }).email(),
  password: z.string({ message: "Email and password are required" }).min(1),
});
const RefreshBody = z.object({ refresh_token: z.string().min(1) });

@Controller("auth")
export class AuthController {
  constructor(
    private readonly login: LoginUseCase,
    private readonly refresh: RefreshSessionUseCase,
    @Inject(ENV) private readonly env: Env,
  ) {}

  private setCookie(res: Response, token: string, maxAgeSeconds: number) {
    res.cookie(ADMIN_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: this.env.COOKIE_SECURE || this.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: maxAgeSeconds * 1000,
    });
  }

  @Post("login")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async signIn(@Body(new ZodPipe(LoginBody)) body: z.infer<typeof LoginBody>, @Res({ passthrough: true }) res: Response) {
    const session = await this.login.execute(body.email, body.password);
    this.setCookie(res, session.token, session.expires_in);
    return { success: true, data: session };
  }

  @Post("refresh")
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async renew(@Body(new ZodPipe(RefreshBody)) body: z.infer<typeof RefreshBody>, @Res({ passthrough: true }) res: Response) {
    const session = await this.refresh.execute(body.refresh_token);
    this.setCookie(res, session.token, session.expires_in);
    return { success: true, data: session };
  }

  @Post("logout")
  @HttpCode(200)
  signOut(@Res({ passthrough: true }) res: Response) {
    res.cookie(ADMIN_TOKEN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0, sameSite: "lax" });
    return { success: true };
  }

  /** Used by the Next middleware to validate the admin cookie before rendering /admin. */
  @Get("session")
  @SkipThrottle()
  @UseGuards(AdminGuard)
  session(@CurrentAdmin() admin: AppRequest["admin"]) {
    return admin;
  }
}

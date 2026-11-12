import { Body, Controller, ForbiddenException, Get, Headers, HttpCode, Inject, Logger, Post, Query, Req, Res } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import type { Response } from "express";
import { ENV } from "../../../shared/infrastructure/config/config.module";
import type { Env } from "../../../shared/infrastructure/config/env";
import { RawResponse } from "../../../shared/infrastructure/http/envelope.interceptor";
import type { AppRequest } from "../../../shared/infrastructure/http/request";
import { safeEqual } from "../../../shared/infrastructure/security/crypto.service";
import { AcceptMetaWebhook } from "../application/messaging.use-cases";
import { verifyMetaSignature } from "../infrastructure/meta-signature";

/**
 * One callback URL for every Meta product: Page (Messenger + feed),
 * Instagram (DMs + comments) and WhatsApp Business Account.
 * Configure it in the Meta app as  https://<domain>/api/webhooks/meta
 */
@Controller("webhooks/meta")
@SkipThrottle()
export class MetaWebhookController {
  private readonly log = new Logger(MetaWebhookController.name);

  constructor(
    private readonly accept: AcceptMetaWebhook,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Subscription handshake: echo hub.challenge as plain text when the verify token matches. */
  @Get()
  @RawResponse()
  verify(@Query("hub.mode") mode: string, @Query("hub.verify_token") token: string, @Query("hub.challenge") challenge: string, @Res() res: Response) {
    if (mode === "subscribe" && safeEqual(token, this.env.META_WEBHOOK_VERIFY_TOKEN)) {
      res.status(200).type("text/plain").send(challenge ?? "");
      return;
    }
    res.status(403).type("text/plain").send("Forbidden");
  }

  @Post()
  @HttpCode(200)
  @RawResponse()
  async receive(@Req() req: AppRequest, @Headers("x-hub-signature-256") signature: string | undefined, @Body() body: Record<string, unknown>) {
    const secrets = [this.env.META_APP_SECRET, this.env.FACEBOOK_APP_SECRET, this.env.INSTAGRAM_APP_SECRET].filter((s): s is string => !!s);
    if (!secrets.some((secret) => verifyMetaSignature(req.rawBody, signature, secret))) {
      this.log.warn("rejected Meta webhook with a bad or missing signature");
      throw new ForbiddenException("Invalid signature");
    }
    await this.accept.execute(body);
    return "EVENT_RECEIVED";
  }
}

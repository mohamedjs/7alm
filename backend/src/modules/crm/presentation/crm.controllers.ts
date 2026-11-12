import { Body, Controller, Get, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post, Query, UnauthorizedException, UseGuards, Headers } from "@nestjs/common";
import { z } from "zod";
import { AdminGuard, CurrentAdmin } from "../../identity";
import { ZodPipe } from "../../../shared/infrastructure/http/zod.pipe";
import { nullable, nullableText } from "../../../shared/infrastructure/http/form-fields";
import type { AppRequest } from "../../../shared/infrastructure/http/request";
import { ENV } from "../../../shared/infrastructure/config/config.module";
import type { Env } from "../../../shared/infrastructure/config/env";
import { safeEqual } from "../../../shared/infrastructure/security/crypto.service";
import { CrmUseCases } from "../application/crm.use-cases";

const PatchBody = z.object({ email: nullable(z.string().email()), notes: nullableText() });
const SendBody = z.object({ body: z.string().trim().min(1, "Message body is required").max(4096, "Message body exceeds 4096 characters") });

@Controller("admin/customers")
@UseGuards(AdminGuard)
export class CustomersAdminController {
  constructor(private readonly crm: CrmUseCases) {}

  @Get()
  list(@Query("page") page = "1", @Query("limit") limit = "20", @Query("search") search?: string) {
    return this.crm.list(Number(page), Number(limit), search);
  }

  @Get("analytics")
  analytics(@Query("days") days?: string) {
    return this.crm.analytics(Number(days) || 30);
  }

  @Get(":id")
  detail(@Param("id", ParseUUIDPipe) id: string) {
    return this.crm.detail(id);
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body(new ZodPipe(PatchBody)) body: z.infer<typeof PatchBody>) {
    return this.crm.update(id, body);
  }

  @Get(":id/messages")
  messages(@Param("id", ParseUUIDPipe) id: string, @Query("page") page = "1", @Query("limit") limit = "50") {
    return this.crm.messages(id, Number(page) || 1, Number(limit) || 50);
  }

  @Post(":id/messages")
  send(@Param("id", ParseUUIDPipe) id: string, @Body(new ZodPipe(SendBody)) body: z.infer<typeof SendBody>, @CurrentAdmin() admin: AppRequest["admin"]) {
    return this.crm.send(id, admin!.id, body.body);
  }
}

const EvolutionEvent = z.discriminatedUnion("type", [
  z.object({ type: z.literal("message"), phone: z.string(), body: z.string().default(""), evolutionMessageId: z.string(), mediaUrl: z.string().optional(), mediaType: z.string().optional() }),
  z.object({ type: z.literal("status"), evolutionMessageId: z.string(), status: z.enum(["pending", "sent", "delivered", "read", "failed"]) }),
]);

/** n8n forwards Evolution API events here (header `x-webhook-secret`). */
@Controller("webhooks/whatsapp")
export class EvolutionWebhookController {
  constructor(
    private readonly crm: CrmUseCases,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Post()
  @HttpCode(200)
  async receive(@Headers("x-webhook-secret") secret: string | undefined, @Body(new ZodPipe(EvolutionEvent)) e: z.infer<typeof EvolutionEvent>) {
    const expected = this.env.WHATSAPP_WEBHOOK_SECRET ?? this.env.N8N_WEBHOOK_SECRET;
    if (!safeEqual(secret, expected)) throw new UnauthorizedException("Unauthorized");
    if (e.type === "message") await this.crm.inbound(e);
    else await this.crm.status(e.evolutionMessageId, e.status);
    return { success: true };
  }
}

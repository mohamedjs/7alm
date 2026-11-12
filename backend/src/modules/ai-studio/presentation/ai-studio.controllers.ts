import { BadRequestException, Body, Controller, Get, Headers, HttpCode, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { z } from "zod";
import { AdminGuard, N8nGuard } from "../../identity";
import { ZodPipe } from "../../../shared/infrastructure/http/zod.pipe";
import type { AppRequest } from "../../../shared/infrastructure/http/request";
import { CAMPAIGN_PLATFORMS, CAMPAIGN_STATUSES } from "../domain/campaign";
import { AiStudioUseCases } from "../application/ai-studio.use-cases";
import { OpenRouterClient, type VideoStatusPayload } from "../infrastructure/openrouter.client";

const required = (m: string) => z.string({ message: m }).trim().min(1, m);
const CampaignBody = z.object({
  name: required("name, niche and objective are required"),
  niche: required("name, niche and objective are required"),
  objective: required("name, niche and objective are required"),
  research_summary: z.string().nullable().optional(),
  headline: required("headline, primary_text and cta are required"),
  primary_text: required("headline, primary_text and cta are required"),
  cta: required("headline, primary_text and cta are required"),
  hashtags: z.string().nullable().optional(),
  platform: z.enum(CAMPAIGN_PLATFORMS).nullable().optional(),
  image_url: z.string().startsWith("https://", "image_url must be an https URL").nullable().optional(),
  target_audience: z.record(z.string(), z.unknown()).nullable().optional(),
  telegram_chat_id: z.coerce.string().nullable().optional(),
  status: z.enum(CAMPAIGN_STATUSES).optional(),
});
const StatusBody = z.object({ status: z.enum(CAMPAIGN_STATUSES) });
const ImageBody = z.object({ prompt: z.string().max(4000).nullable().optional() });
const N8nImageBody = z.object({ prompt: required("prompt is required"), previous_image_url: z.string().nullable().optional() });
const VideoBody = z.object({
  prompt: required("prompt is required"),
  previous_video_url: z.string().nullable().optional(),
  campaign_id: z.string().uuid().nullable().optional(),
  telegram_chat_id: z.coerce.string().nullable().optional(),
});

@Controller("admin/ai-studio/campaigns")
@UseGuards(AdminGuard)
export class AiStudioAdminController {
  constructor(private readonly studio: AiStudioUseCases) {}

  @Get()
  list(@Query("status") status?: string) {
    return this.studio.listCampaigns((CAMPAIGN_STATUSES as readonly string[]).includes(status ?? "") ? status : undefined);
  }

  @Patch(":id")
  status(@Param("id", ParseUUIDPipe) id: string, @Body(new ZodPipe(StatusBody)) body: z.infer<typeof StatusBody>) {
    return this.studio.setCampaignStatus(id, body.status);
  }

  @Post(":id/image")
  @HttpCode(200)
  image(@Param("id", ParseUUIDPipe) id: string, @Body(new ZodPipe(ImageBody)) body: z.infer<typeof ImageBody>) {
    return this.studio.generateCampaignImage(id, body.prompt);
  }
}

/** Telegram marketing agent (n8n). */
@Controller("n8n/ai-studio")
@UseGuards(N8nGuard)
export class AiStudioN8nController {
  constructor(private readonly studio: AiStudioUseCases) {}

  @Post("campaigns")
  @HttpCode(200)
  campaign(@Body(new ZodPipe(CampaignBody)) body: z.infer<typeof CampaignBody>) {
    return this.studio.saveCampaign(body);
  }

  @Post("images")
  @HttpCode(200)
  async image(@Body(new ZodPipe(N8nImageBody)) body: z.infer<typeof N8nImageBody>) {
    const { url, cost } = await this.studio.generateImage(body.prompt, body.previous_image_url?.trim() || null);
    return { success: true, url, cost };
  }

  @Post("videos")
  @HttpCode(200)
  async video(@Body(new ZodPipe(VideoBody)) body: z.infer<typeof VideoBody>) {
    const { job, pollingUrl } = await this.studio.submitVideo(body);
    return { success: true, job_id: job.id, status: job.status, polling_url: pollingUrl };
  }

  @Get("videos/pending")
  async pending() {
    return { success: true, ...(await this.studio.pollStale()) };
  }

  @Get("videos/:id")
  async job(@Param("id", ParseUUIDPipe) id: string) {
    const job = await this.studio.video(id);
    if (!job) throw new NotFoundException("Job not found");
    return job;
  }
}

@Controller("webhooks/openrouter")
@SkipThrottle()
export class OpenRouterWebhookController {
  constructor(
    private readonly studio: AiStudioUseCases,
    private readonly openrouter: OpenRouterClient,
  ) {}

  @Post("video")
  @HttpCode(200)
  async video(@Req() req: AppRequest, @Headers("x-openrouter-signature") sig: string | undefined, @Body() body: { data?: VideoStatusPayload } & Partial<VideoStatusPayload>) {
    if (!this.openrouter.verifySignature(req.rawBody, sig)) throw new UnauthorizedException("Invalid signature");
    const job = (body?.data ?? body) as VideoStatusPayload;
    if (!job?.id || !job?.status) throw new BadRequestException("Missing id/status");
    await this.studio.onVideoCallback(job);
    return { success: true };
  }
}

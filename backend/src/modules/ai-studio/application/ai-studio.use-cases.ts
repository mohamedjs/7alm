import { Inject, Injectable, Logger } from "@nestjs/common";
import { DomainError } from "../../../shared/domain/domain-error";
import { STORAGE, type Storage } from "../../../shared/application/storage.port";
import { isTerminal, promptFromCampaign, type CampaignStatus } from "../domain/campaign";
import { AiStudioRepository } from "../infrastructure/ai-studio.repository";
import { OpenRouterClient, type VideoStatusPayload } from "../infrastructure/openrouter.client";

export interface CampaignInput {
  name: string;
  niche: string;
  objective: string;
  research_summary?: string | null;
  headline: string;
  primary_text: string;
  cta: string;
  hashtags?: string | null;
  platform?: string | null;
  image_url?: string | null;
  target_audience?: Record<string, unknown> | null;
  telegram_chat_id?: string | null;
  status?: CampaignStatus;
}

@Injectable()
export class AiStudioUseCases {
  private readonly log = new Logger(AiStudioUseCases.name);

  constructor(
    private readonly repo: AiStudioRepository,
    private readonly openrouter: OpenRouterClient,
    @Inject(STORAGE) private readonly storage: Storage,
  ) {}

  listCampaigns(status?: string) {
    return this.repo.listCampaigns(status);
  }

  saveCampaign(input: CampaignInput) {
    const { target_audience, ...rest } = input;
    return this.repo.createCampaign({ ...rest, ...(target_audience ? { target_audience: target_audience as object } : {}) });
  }

  setCampaignStatus(id: string, status: CampaignStatus) {
    return this.repo.updateCampaign(id, { status });
  }

  /** Generate (or edit, when a prompt is given and an image exists) the campaign visual. */
  async generateCampaignImage(id: string, prompt?: string | null) {
    const campaign = await this.repo.campaign(id);
    if (!campaign) throw DomainError.notFound("Campaign not found");
    const custom = prompt?.trim();
    const { url } = await this.generateImage(custom || promptFromCampaign(campaign), custom ? campaign.image_url : null);
    return this.repo.updateCampaign(id, { image_url: url });
  }

  async generateImage(prompt: string, referenceUrl?: string | null) {
    if (referenceUrl && !this.storage.isOurs(referenceUrl)) throw DomainError.validation("previous_image_url must be an image we host");
    const img = await this.openrouter.image(prompt, referenceUrl);
    const { url } = await this.storage.put("ai-studio", img.bytes, img.contentType);
    return { url, cost: img.cost };
  }

  async submitVideo(input: { prompt: string; previous_video_url?: string | null; campaign_id?: string | null; telegram_chat_id?: string | null }) {
    if (input.previous_video_url && !this.storage.isOurs(input.previous_video_url)) throw DomainError.validation("previous_video_url must be a video we host");
    const submitted = await this.openrouter.submitVideo(input.prompt, input.previous_video_url);
    const job = await this.repo.createVideo({ ...input, openrouter_job_id: submitted.id, status: "pending" });
    return { job, pollingUrl: submitted.pollingUrl };
  }

  video(id: string) {
    return this.repo.video(id);
  }

  /** OpenRouter callback (idempotent: terminal jobs are left alone). */
  async onVideoCallback(payload: VideoStatusPayload) {
    const job = await this.repo.videoByOpenRouterId(payload.id);
    if (!job || isTerminal(job.status)) return job;
    const updated = await this.apply(job.id, payload);
    if (updated?.status === "completed" && updated.telegram_chat_id && updated.video_url) {
      await this.openrouter.telegramVideo(updated.telegram_chat_id, updated.video_url);
    }
    return updated;
  }

  /** Poll fallback for jobs whose callback never arrived. */
  async pollStale() {
    const stale = await this.repo.staleVideos(2);
    const results = await Promise.allSettled(stale.map(async (j) => this.apply(j.id, await this.openrouter.pollVideo(j.openrouter_job_id!))));
    return {
      checked: stale.length,
      results: results.map((r, i) => ({ job_id: stale[i].id, openrouter_job_id: stale[i].openrouter_job_id, outcome: r.status === "fulfilled" ? r.value.status : "poll_error" })),
    };
  }

  private async apply(jobId: string, s: VideoStatusPayload) {
    const patch: Record<string, unknown> = { status: s.status };
    if (s.usage?.cost !== undefined) patch.cost = s.usage.cost;
    if (s.error?.message) patch.error = s.error.message;
    if (s.status === "completed" && s.unsigned_urls?.[0]) {
      try {
        const bytes = await this.openrouter.download(s.unsigned_urls[0]);
        patch.video_url = (await this.storage.put("ai-studio/videos", bytes, "video/mp4")).url;
      } catch (e) {
        return this.repo.updateVideo(jobId, { status: "failed", error: e instanceof Error ? e.message : "Failed to store video" });
      }
    }
    if (isTerminal(s.status)) patch.completed_at = new Date();
    return this.repo.updateVideo(jobId, patch);
  }
}

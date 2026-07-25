import { CampaignsRepository } from "@/features/ai-studio/campaigns.repository";
import { imagesService } from "@/features/ai-studio/images.service";
import type { AdCampaign, AdCampaignInput, AdCampaignStatus } from "@/features/shared/types";

export class CampaignsService {
  constructor(private readonly repo = new CampaignsRepository()) {}

  async list(status?: AdCampaignStatus): Promise<AdCampaign[]> {
    return this.repo.list(status);
  }

  async getById(id: string): Promise<AdCampaign | null> {
    return this.repo.getById(id);
  }

  /**
   * Persists a campaign the owner approved in the Telegram chat. Always a
   * fresh insert — one approval turn produces one campaign row, there is
   * no session/upsert concept because the conversation itself (n8n memory
   * keyed by chat id) is where back-and-forth negotiation lives, not the DB.
   */
  async saveApprovedCampaign(input: AdCampaignInput): Promise<AdCampaign> {
    return this.repo.create(input);
  }

  async updateStatus(id: string, status: AdCampaignStatus): Promise<AdCampaign> {
    return this.repo.updateStatus(id, status);
  }

  /**
   * Generates a visual for an existing campaign from the dashboard and saves
   * it on the row. Passing the campaign's current image as the reference makes
   * this a refine rather than a fresh generation, matching the Telegram loop.
   */
  async generateImage(id: string, prompt?: string | null): Promise<AdCampaign> {
    const campaign = await this.repo.getById(id);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    const { url } = await imagesService.generate(
      prompt?.trim() || buildPromptFromCampaign(campaign),
      // A supplied prompt means "change this"; no prompt means "make me one".
      prompt?.trim() ? campaign.image_url : null
    );

    return this.repo.updateImageUrl(id, url);
  }
}

/**
 * Falls back to the campaign's own copy when the admin didn't type a prompt —
 * the visual should follow the campaign it belongs to, not a blank brief.
 */
function buildPromptFromCampaign(campaign: AdCampaign): string {
  const parts = [
    campaign.headline,
    campaign.primary_text,
    campaign.niche && `Niche: ${campaign.niche}`,
    campaign.objective && `Objective: ${campaign.objective}`,
  ].filter(Boolean);

  return [
    "A polished square social-media advertising image for an Egyptian online store.",
    "No text overlay, no watermarks, no logos.",
    ...parts,
  ].join("\n");
}

export const campaignsService = new CampaignsService();

import { CampaignsRepository } from "@/features/ai-studio/campaigns.repository";
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
}

export const campaignsService = new CampaignsService();

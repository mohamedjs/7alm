export const CAMPAIGN_STATUSES = ["draft", "ready", "published", "archived"] as const;
export const CAMPAIGN_PLATFORMS = ["meta", "facebook_instagram", "whatsapp"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];
export type CampaignPlatform = (typeof CAMPAIGN_PLATFORMS)[number];

export const VIDEO_STATUSES = ["pending", "in_progress", "completed", "failed", "cancelled", "expired"] as const;
export type VideoStatus = (typeof VIDEO_STATUSES)[number];
export const isTerminal = (s: string) => s === "completed" || s === "failed" || s === "cancelled" || s === "expired";

export interface CampaignLike {
  headline: string | null;
  primary_text: string | null;
  niche: string | null;
  objective: string | null;
}

/** Default image prompt when the admin regenerates without typing one. */
export function promptFromCampaign(c: CampaignLike): string {
  return [
    "A polished square social-media advertising image for an Egyptian online store.",
    "No text overlay, no watermarks, no logos.",
    c.headline,
    c.primary_text,
    c.niche && `Niche: ${c.niche}`,
    c.objective && `Objective: ${c.objective}`,
  ]
    .filter(Boolean)
    .join("\n");
}

import { randomUUID } from "node:crypto";
import { supabase } from "@/lib/supabase";

const OPENROUTER_IMAGES_URL = "https://openrouter.ai/api/v1/images";
const IMAGE_MODEL = "google/gemini-2.5-flash-image";
const STORAGE_BUCKET = "7alm";
const STORAGE_PREFIX = "ai-studio";

/**
 * Only images we already host may be fed back in as an edit reference. This is
 * not an SSRF guard (OpenRouter fetches the URL, not us) — it stops an
 * LLM-supplied URL from pushing arbitrary third-party content through the
 * vendor and into an ad.
 */
const ALLOWED_REFERENCE_PREFIX = `${process.env.SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/`;

interface OpenRouterImageResponse {
  data?: { b64_json?: string; media_type?: string }[];
  usage?: { cost?: number };
  error?: { message?: string };
}

export interface GenerateImageResult {
  url: string;
  cost: number | null;
}

export class ImagesService {
  /**
   * Generates a campaign image and returns a public https URL — never bytes.
   *
   * The URL-not-bytes contract is load-bearing: n8n drops binary from an AI
   * tool's output entirely, and returning base64 as JSON would push ~1.4MB
   * into the agent's 10-message memory window and destroy the negotiation
   * loop. See specs/014-campaign-image-generation/spec.md §0.
   */
  async generate(prompt: string, previousImageUrl?: string | null): Promise<GenerateImageResult> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    if (previousImageUrl && !previousImageUrl.startsWith(ALLOWED_REFERENCE_PREFIX)) {
      throw new Error("previous_image_url must be an image we host");
    }

    const body: Record<string, unknown> = { model: IMAGE_MODEL, prompt };
    if (previousImageUrl) {
      body.input_references = [
        { type: "image_url", image_url: { url: previousImageUrl } },
      ];
    }

    const response = await fetch(OPENROUTER_IMAGES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as OpenRouterImageResponse;
    if (!response.ok || payload.error) {
      throw new Error(payload.error?.message || `OpenRouter returned ${response.status}`);
    }

    const image = payload.data?.[0];
    if (!image?.b64_json) {
      throw new Error("OpenRouter returned no image data");
    }

    const cost = payload.usage?.cost ?? null;
    // Metered per image; an agent generating in a loop is the realistic
    // failure mode, so spend stays observable even without a cap.
    console.log(`[ai-studio] image generated, cost=$${cost ?? "unknown"}`);

    const contentType = image.media_type || "image/png";
    const extension = contentType.split("/")[1] || "png";
    const path = `${STORAGE_PREFIX}/${randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, Buffer.from(image.b64_json, "base64"), { contentType });

    if (uploadError) {
      console.error("Error uploading generated image:", uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, cost };
  }
}

export const imagesService = new ImagesService();

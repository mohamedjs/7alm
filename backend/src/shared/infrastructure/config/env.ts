import { z } from "zod";

const bool = z
  .string()
  .optional()
  .transform((v) => v === "1" || v === "true");

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v : undefined));

/**
 * Every environment variable the backend reads, validated once at boot.
 * Process exits with a readable list if a required one is missing.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  KAFKA_BROKERS: z.string().default("localhost:9092"),
  KAFKA_CLIENT_ID: z.string().default("halm"),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_ACCESS_TTL: z.string().default("12h"),
  JWT_REFRESH_TTL: z.string().default("30d"),
  COOKIE_SECURE: bool,

  ADMIN_SEED_EMAIL: optionalString,
  ADMIN_SEED_PASSWORD: optionalString,

  N8N_API_ACCESS_TOKEN: optionalString,
  N8N_WEBHOOK_SECRET: optionalString,
  N8N_ORDER_WEBHOOK_URL: optionalString,
  N8N_WHATSAPP_SEND_WEBHOOK_URL: optionalString,
  N8N_SEND_WEBHOOK_SECRET: optionalString,
  WHATSAPP_WEBHOOK_SECRET: optionalString,

  DEFAULT_SHIPPING_PROVIDER: z.enum(["bosta", "abs", "mylerz", "test"]).default("bosta"),
  BOSTA_API_KEY: optionalString,
  BOSTA_BASE_URL: z.string().default("https://app.bosta.co/api/v2"),
  SHIPPING_WEBHOOK_SECRET: optionalString,

  RESEND_API_KEY: optionalString,
  ADMIN_ALERT_EMAIL: optionalString,
  EMAIL_FROM: z.string().default("onboarding@resend.dev"),

  REVIEW_TOKEN_SECRET: optionalString,

  UPLOAD_DIR: z.string().default("./uploads"),
  PUBLIC_UPLOAD_BASE: z.string().default("/uploads"),
  MAX_UPLOAD_MB: z.coerce.number().default(50),

  SOCIAL_MOCK_MODE: bool,
  SOCIAL_OAUTH_REDIRECT_BASE: z.string().default("http://localhost:3000"),
  SOCIAL_TOKEN_ENCRYPTION_KEY: optionalString,
  FACEBOOK_APP_ID: optionalString,
  FACEBOOK_APP_SECRET: optionalString,
  INSTAGRAM_APP_ID: optionalString,
  INSTAGRAM_APP_SECRET: optionalString,
  TIKTOK_CLIENT_ID: optionalString,
  TIKTOK_CLIENT_SECRET: optionalString,
  WHATSAPP_APP_ID: optionalString,
  WHATSAPP_APP_SECRET: optionalString,

  META_GRAPH_VERSION: z.string().default("v27.0"),
  META_APP_SECRET: optionalString,
  META_WEBHOOK_VERIFY_TOKEN: optionalString,
  META_PAGE_ID: optionalString,
  META_PAGE_ACCESS_TOKEN: optionalString,
  META_IG_ACCOUNT_ID: optionalString,
  /** Instagram token from "API setup with Unified login" → Generate access tokens (no Facebook Page needed). */
  META_IG_ACCESS_TOKEN: optionalString,
  META_WHATSAPP_PHONE_NUMBER_ID: optionalString,
  META_WHATSAPP_TOKEN: optionalString,
  META_WHATSAPP_FALLBACK_TEMPLATE: optionalString,
  META_WHATSAPP_TEMPLATE_LANG: z.string().default("ar"),

  OPENROUTER_API_KEY: optionalString,
  OPENROUTER_IMAGE_MODEL: z.string().default("google/gemini-3.1-flash-lite-image"),
  OPENROUTER_VIDEO_MODEL: z.string().default("bytedance/seedance-2.0"),
  OPENROUTER_VIDEO_CALLBACK_URL: optionalString,
  TELEGRAM_BOT_TOKEN: optionalString,
  TEST_SHIPPING_DELAY_MS: z.coerce.number().default(30_000),
  SHIPPING_TEST_WEBHOOK_BASE: optionalString,
  OPENROUTER_WEBHOOK_SECRET: optionalString,
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join("\n")}`);
  }
  return parsed.data;
}

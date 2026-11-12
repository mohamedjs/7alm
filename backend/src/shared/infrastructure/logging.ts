import type { Params } from "nestjs-pino";
import { randomUUID } from "node:crypto";

/** JSON logs in production, pretty logs in development; secrets are redacted. */
export function loggerOptions(service: "api" | "worker"): Params {
  const isProd = process.env.NODE_ENV === "production";
  return {
    pinoHttp: {
      level: process.env.LOG_LEVEL ?? "info",
      base: { service },
      genReqId: (req) => (req.headers["x-request-id"] as string) || randomUUID(),
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "req.headers['x-n8n-access-token']",
          "req.headers['x-hub-signature-256']",
          "res.headers['set-cookie']",
        ],
        censor: "[redacted]",
      },
      serializers: {
        req: (req: { id: string; method: string; url: string }) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
      autoLogging: { ignore: (req) => (req.url ?? "").startsWith("/health") },
      transport: isProd ? undefined : { target: "pino-pretty", options: { singleLine: true } },
    },
  };
}

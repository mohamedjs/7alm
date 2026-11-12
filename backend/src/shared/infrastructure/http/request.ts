import type { Request } from "express";

/** Request augmented by guards and the raw-body middleware. */
export interface AppRequest extends Request {
  admin?: { id: string; email: string };
  rawBody?: Buffer;
}

export function clientIp(req: Request): string | undefined {
  const fwd = req.headers["x-forwarded-for"];
  const first = Array.isArray(fwd) ? fwd[0] : fwd?.split(",")[0];
  return first?.trim() || req.socket.remoteAddress || undefined;
}

import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ENV } from "../config/config.module";
import type { Env } from "../config/env";
import type { Storage } from "../../application/storage.port";

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

/** Files on a Docker volume, served by the api at PUBLIC_UPLOAD_BASE (Caddy routes /uploads to it). */
@Injectable()
export class LocalStorage implements Storage {
  constructor(@Inject(ENV) private readonly env: Env) {}

  private get publicBase() {
    const base = this.env.PUBLIC_UPLOAD_BASE;
    return base.startsWith("http") ? base.replace(/\/$/, "") : `${this.env.PUBLIC_APP_URL.replace(/\/$/, "")}${base}`;
  }

  async put(folder: string, bytes: Buffer, contentType: string, extension?: string) {
    const safeFolder = folder.replace(/[^a-z0-9/_-]/gi, "").replace(/^\/+|\/+$/g, "") || "misc";
    const ext = (EXT[contentType] ?? extension ?? "bin").replace(/[^a-z0-9]/gi, "").toLowerCase();
    const key = `${safeFolder}/${randomUUID()}.${ext}`;
    const full = path.resolve(this.env.UPLOAD_DIR, key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, bytes);
    return { key, url: `${this.publicBase}/${key}` };
  }

  isOurs(url: string) {
    return url.startsWith(this.publicBase + "/");
  }
}

export const ALLOWED_UPLOAD_TYPES = Object.keys(EXT);

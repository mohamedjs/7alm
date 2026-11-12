/** File storage port. Local volume today; an S3-compatible adapter can replace it without touching modules. */
export const STORAGE = Symbol("STORAGE");
export interface Storage {
  /** Saves bytes under `folder/` and returns the public URL. */
  put(folder: string, bytes: Buffer, contentType: string, extension?: string): Promise<{ url: string; key: string }>;
  /** True when `url` points at a file we host (safe to pass to third parties as a reference). */
  isOurs(url: string): boolean;
}

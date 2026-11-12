import "server-only";

/**
 * Server Components → NestJS api. Server-side code never touches the
 * database: it calls the same `/api/*` contract the browser uses, over the
 * internal network (BACKEND_URL, e.g. http://api:4000 in Docker).
 */
const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:4000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function serverGet<T>(path: string, opts: { revalidate?: number | false; tags?: string[] } = {}): Promise<T | null> {
  const res = await fetch(`${BACKEND_URL}/api${path}`, {
    headers: { accept: "application/json" },
    next: opts.revalidate === false ? undefined : { revalidate: opts.revalidate ?? 60, tags: opts.tags },
    cache: opts.revalidate === false ? "no-store" : undefined,
  });
  if (res.status === 404) return null;
  const json = (await res.json().catch(() => null)) as { success?: boolean; data?: T; error?: string } | null;
  if (!res.ok || !json?.success) throw new ApiError(json?.error ?? `API ${res.status} for ${path}`, res.status);
  return (json.data ?? null) as T | null;
}

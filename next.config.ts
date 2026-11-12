import type { NextConfig } from "next";

/**
 * The web tier is presentation only: every `/api/*` and `/uploads/*`
 * request is proxied to the NestJS api (BACKEND_URL). In production Caddy
 * routes those paths to the api directly; the rewrites keep `npm run dev`
 * and single-container setups working with the same relative URLs.
 */
const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:4000").replace(/\/$/, "");

function hostOf(url: string | undefined) {
  try {
    return url ? new URL(url) : null;
  } catch {
    return null;
  }
}

const appUrl = hostOf(process.env.NEXT_PUBLIC_APP_URL);

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // `next dev` behind a tunnel (Meta OAuth/webhooks need HTTPS): NEXT_DEV_ORIGINS=host1,host2
  allowedDevOrigins: (process.env.NEXT_DEV_ORIGINS ?? "").split(",").map((h) => h.trim()).filter(Boolean),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      // Connected-account avatars (Facebook / Instagram CDNs)
      { protocol: "https", hostname: "**.fbcdn.net" },
      { protocol: "https", hostname: "**.cdninstagram.com" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
      ...(appUrl ? [{ protocol: appUrl.protocol.replace(":", "") as "http" | "https", hostname: appUrl.hostname }] : []),
    ],
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` },
      { source: "/uploads/:path*", destination: `${BACKEND_URL}/uploads/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;

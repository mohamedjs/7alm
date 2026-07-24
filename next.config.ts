import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: false,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "zuajkdttqzgwwdnsjmjk.supabase.co",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        // Mock social-connection avatars (SOCIAL_MOCK_MODE) — see
        // src/features/social/providers/mock.provider.ts.
        protocol: "https",
        hostname: "api.dicebear.com",
      },
    ],
  },
  allowedDevOrigins: ['192.168.1.225'],
};

export default nextConfig;

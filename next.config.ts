import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: false,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "zuajkdttqzgwwdnsjmjk.supabase.co",
      },
    ],
  },
  allowedDevOrigins: ['192.168.1.225'],
};

export default nextConfig;

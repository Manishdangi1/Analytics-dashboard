import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    const backend = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
    if (!backend) {
      return [];
    }
    return [
      {
        source: "/auth/:path*",
        destination: `${backend}/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Cloudflare Workers deployment
  output: "standalone",
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/favicon.svg" }];
  },
  serverExternalPackages: ["lightweight-charts"],
};

export default nextConfig;

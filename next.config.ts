import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.BUILD_CHECK === "true" ? ".next-buildcheck" : ".next",
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;

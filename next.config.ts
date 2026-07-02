import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.BUILD_CHECK === "true" ? ".next-buildcheck" : ".next",
};

export default nextConfig;

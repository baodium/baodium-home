import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: false,
  poweredByHeader: false,
  // Local and cloud browsers open the dev server on 127.0.0.1. Without this,
  // Next blocks the dev assets that attach the page.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;

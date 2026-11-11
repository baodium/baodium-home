import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: false,
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/",
          has: [{ type: "host", value: "labs.baodium.com" }],
          destination: "/labs",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async redirects() {
    return ["baodium.com", "www.baodium.com"].map((host) => ({
      source: "/sre-labs/:path*",
      has: [{ type: "host" as const, value: host }],
      destination: "https://labs.baodium.com/sre-labs/:path*",
      permanent: true,
    }));
  },
  async headers() {
    return [
      {
        source: "/workers/sre-python.mjs",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'none'; script-src 'self' https://cdn.jsdelivr.net 'unsafe-eval' 'wasm-unsafe-eval'; connect-src https://cdn.jsdelivr.net; worker-src 'none'",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
  poweredByHeader: false,
  // Local and cloud browsers open the dev server on 127.0.0.1. Without this,
  // Next blocks the dev assets that attach the page.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;

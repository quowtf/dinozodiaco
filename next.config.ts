import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  async rewrites() {
    return [
      {
        source: "/js/pa-Ga3lzYhz6urImFW6-6xK7.js",
        destination: "https://plausible.io/js/pa-Ga3lzYhz6urImFW6-6xK7.js",
      },
      {
        source: "/api/event",
        destination: "https://plausible.io/api/event",
      },
    ];
  },
};

export default nextConfig;

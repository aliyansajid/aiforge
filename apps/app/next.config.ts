import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/ui", "@repo/db", "@repo/auth"],
  // Exclude Python virtual environments and model files from build
  serverExternalPackages: ["@prisma/client", "@google-cloud/storage"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        port: "",
        pathname: "/aiforge-assets/**",
      },
    ],
  },
  // Turbopack config (Next.js 16+) - empty config to acknowledge transition
  turbopack: {},
  webpack: (config, { isServer }) => {
    // Exclude Node.js modules from client-side bundles
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        child_process: false,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        http2: false,
      };
    }
    return config;
  },
};

export default nextConfig;

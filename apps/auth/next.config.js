/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/ui", "@repo/db", "@repo/auth"],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

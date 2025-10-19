/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/ui", "@repo/auth", "@repo/db"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  generateBuildId: async () => {
    return "build-" + Date.now();
  },
};

export default nextConfig;

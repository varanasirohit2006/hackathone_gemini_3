import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Increase server action body size limit for image uploads (default is 1MB)
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;

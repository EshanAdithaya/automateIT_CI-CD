import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // !! WARN !!
    // Ignoring type checking by setting ignoreBuildErrors to true
    // This is not recommended unless you're experiencing build issues due to type errors
    ignoreBuildErrors: true,
  },
  eslint: {
    // !! WARN !!
    // Ignoring ESLint errors by setting ignoreDuringBuilds to true
    // This is not recommended for production code
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

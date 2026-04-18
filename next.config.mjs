/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Remove turbo option as it's not valid
  experimental: {
    // Add valid experimental options here if needed
  },
  // Force webpack
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Return config to use webpack instead of turbopack
    return config;
  },
}

export default nextConfig

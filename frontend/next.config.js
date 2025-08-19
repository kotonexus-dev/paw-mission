/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'my-teamc-app-animations.s3.ap-northeast-1.amazonaws.com',
      },
    ],
    formats: ['image/webp', 'image/avif'], // Modern formats for better compression
    minimumCacheTTL: 60 * 60 * 24 * 7, // Cache images for 7 days
    dangerouslyAllowSVG: false, // Security: disable SVG support
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Enable compression
  compress: true,
  // Performance optimizations
  swcMinify: true,
  experimental: {
    // Enable modern bundling features
    optimizeCss: true,
  },
};

module.exports = nextConfig;

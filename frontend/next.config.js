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
  },
};

module.exports = nextConfig;

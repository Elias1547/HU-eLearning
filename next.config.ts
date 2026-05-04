import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media.geeksforgeeks.org" },
      { protocol: "https", hostname: "simpleprogrammer.com" },
      { protocol: "https", hostname: "marketplace.canva.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "static-cse.canva.com" },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: "/upload/:path*",
        destination: "/upload/:path*",
      },
    ];
  },
};

export default nextConfig;

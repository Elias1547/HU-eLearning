import type { NextConfig } from "next";
import { hostname } from "os";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media.geeksforgeeks.org" },
      { protocol: "https", hostname: "simpleprogrammer.com" },
      { protocol: "https", hostname: "marketplace.canva.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "static-cse.canva.com" },
        {protocol: "https",
        hostname: "plus.unsplash.com"} ,
      { protocol: "https",
        hostname: "images.unsplash.com",
      },
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
import type { NextConfig } from "next";

function proxyTarget() {
  const raw = process.env.API_PROXY_TARGET?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "").replace(/\/api$/i, "");
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  async rewrites() {
    const target = proxyTarget();
    if (!target) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${target}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const extraHosts = (process.env.IMAGE_REMOTE_HOSTS ?? "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

const MIRROR_HOSTS = [
  "vella-ua.vercel.app",
  "vellabrand.vercel.app",
  "vellastore.vercel.app",
  "vella-store.vercel.app",
  "vella-eight-teal.vercel.app",
  "vella-msvt1.vercel.app",
];

const nextConfig: NextConfig = {
  images: {
    // Photos are served as stored (resized to WEBP on upload): the hosting plan's image-optimisation quota
    // runs out with a large catalogue, and then every new image size fails to load.
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    qualities: [60, 75, 85],
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      ...extraHosts.map((hostname) => ({ protocol: "https" as const, hostname })),
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  poweredByHeader: false,
  // Old *.vercel.app names of the production site serve the same pages as vella.top;
  // send visitors and search engines to the one address. Per-deployment and branch
  // URLs are not listed, so previews keep working.
  async redirects() {
    return MIRROR_HOSTS.map((host) => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: host }],
      destination: "https://vella.top/:path*",
      permanent: true,
    }));
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // No framing by other sites, no <base> hijacking, no plugins, forms only to the store and LiqPay.
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self' https://www.liqpay.ua",
          },
        ],
      },
      { source: "/demo/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

/**
 * Only matters for `next dev`. The production server (`next start`) has no
 * dev-only endpoints and ignores this. Next.js blocks dev resources (including
 * the /_next/hmr hot-reload socket) for any host other than localhost; to open
 * a dev server through a tunnel, name that host here instead of weakening the
 * check, e.g.  ALLOWED_DEV_ORIGINS=my-name.trycloudflare.com npm run dev
 */
const allowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(allowedDevOrigins.length ? { allowedDevOrigins } : {}),
};

export default nextConfig;

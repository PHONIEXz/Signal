import type { NextConfig } from "next";
import { canonicalAppRedirects } from "./lib/canonical-app.ts";

const nextConfig: NextConfig = {
  // Keep the adapter and its native binding resolved from their package directory.
  async redirects() { return canonicalAppRedirects(process.env.APP_URL); },
  serverExternalPackages: ["@prisma/adapter-better-sqlite3"],
};

export default nextConfig;

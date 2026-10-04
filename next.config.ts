import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the adapter and its native binding resolved from their package directory.
  serverExternalPackages: ["@prisma/adapter-better-sqlite3"],
  allowedDevOrigins: ["playful-unseeing-nature.ngrok-free.dev"],
};

export default nextConfig;

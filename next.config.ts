import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native SQLite bindings must resolve from their installed package directory.
  serverExternalPackages: ["@prisma/adapter-better-sqlite3", "better-sqlite3"],
  allowedDevOrigins: ["playful-unseeing-nature.ngrok-free.dev"],
};

export default nextConfig;

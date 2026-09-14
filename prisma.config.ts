import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Prisma CLI migrations stay local. Turso setup uses the explicit script.
    url: process.env.DATABASE_URL || "file:./dev.db",
  },
});

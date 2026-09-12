import { emailValue } from "../lib/auth-policy.ts";
import { isLoopback, resetOrigin } from "../lib/reset-config.ts";

// Deliberate local developer action only. No HTTP route ever prints a token.
if (process.env.NODE_ENV === "production" || process.env.EMAIL_PROVIDER !== "local" ||
    !isLoopback(new URL(resetOrigin())) || !process.env.DATABASE_URL?.startsWith("file:")) {
  throw new Error("Use only a local development database, EMAIL_PROVIDER=local, and a localhost APP_URL.");
}
const email = emailValue(process.argv[2]);
if (!email) throw new Error("Usage: npm run dev:reset-link -- your-test-account@example.com");
const { issueResetLink } = await import("../lib/password-reset.ts");
const { prisma } = await import("../lib/prisma.ts");
try {
  const issued = await issueResetLink(email);
  if (!issued) throw new Error("Create a local password test account first.");
  console.log("LOCAL TEST ONLY. Keep this reset link private:");
  console.log(issued.url);
} finally { await prisma.$disconnect(); }

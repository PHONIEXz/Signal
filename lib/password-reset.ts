import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma.ts";
import { passwordError } from "./auth-policy.ts";
import { configuredValue, resetOrigin } from "./reset-config.ts";

export const RESET_TTL_MS = 30 * 60 * 1000;
export const RESET_CODE_TTL_MS = 10 * 60 * 1000;
export const GENERIC_RESET_MESSAGE =
  "If that email belongs to a password account, a reset link will arrive shortly. Check your spam folder too.";

export function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

// Persisted atomic counters work across processes sharing SQLite.
// A global cap avoids trusting spoofable forwarded IP headers.
export async function takeAuthQuota(scope: string, subject: string, limit: number, windowMs: number) {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const expiresAt = new Date(windowStart + windowMs);
  const key = digest(scope + ":" + subject + ":" + windowStart);
  const row = await prisma.authRateLimit.upsert({
    where: { key },
    create: { key, count: 1, expiresAt },
    update: { count: { increment: 1 } },
  });
  await prisma.authRateLimit.deleteMany({ where: { expiresAt: { lte: new Date(now) } } });
  return row.count <= limit;
}

// Legacy emails may contain uppercase characters. Fail closed on ambiguity.
export async function findPasswordUser(email: string) {
  // Fixed SQL with a bound value, never string interpolation.
  const matches = await prisma.$queryRawUnsafe<{ id: string }[]>(
    'SELECT "id" FROM "User" WHERE lower("email") = ? LIMIT 2', email.toLowerCase(),
  );
  if (matches.length !== 1) return null;
  const user = await prisma.user.findUnique({ where: { id: matches[0].id } });
  return user?.hashedPassword ? user : null;
}

export async function issueResetLink(email: string) {
  const origin = resetOrigin();
  const user = await findPasswordUser(email);
  if (!user) return null; // Google-only accounts continue to use Google.
  const token = randomBytes(32).toString("hex");
  const tokenHash = digest(token);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);
  await prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  await prisma.passwordResetToken.upsert({
    where: { userId: user.id },
    create: { userId: user.id, tokenHash, expiresAt },
    update: { tokenHash, expiresAt },
  });
  // Fragments aren't sent in HTTP requests/access logs. The form clears it
  // from history on arrival, and submits the token in the POST body only.
  return { email: user.email, tokenHash, url: origin + "/reset-password#token=" + token };
}

export async function consumeResetToken(token: string, password: string) {
  if (!/^[a-f0-9]{64}$/.test(token) || passwordError(password)) return null;
  const tokenHash = digest(token);
  return consumeHash(tokenHash, password);
}

function codeDigest(userId: string, salt: string, code: string) {
  const secret = configuredValue(process.env.AUTH_SECRET);
  if (!secret) throw new Error("AUTH_SECRET is required for reset codes");
  return createHmac("sha256", secret).update(JSON.stringify(["signal-reset-code-v1", userId, salt, code])).digest("hex");
}

export async function issueResetCode(email: string) {
  resetOrigin();
  const user = await findPasswordUser(email);
  if (!user) return null;
  const code = randomInt(0, 1000000).toString().padStart(6, "0");
  const salt = randomBytes(16).toString("hex");
  // A tagged, salted HMAC prevents offline guessing and separates codes from links.
  const tokenHash = `code:${salt}:${codeDigest(user.id, salt, code)}`;
  const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MS);
  await prisma.passwordResetToken.upsert({
    where: { userId: user.id },
    create: { userId: user.id, tokenHash, expiresAt },
    update: { tokenHash, expiresAt },
  });
  return { email: user.email, tokenHash, code };
}

export async function consumeResetCode(email: string, code: string, password: string) {
  if (!/^\d{6}$/.test(code) || passwordError(password)) return null;
  const user = await findPasswordUser(email);
  if (!user) return null;
  const candidate = await prisma.passwordResetToken.findUnique({ where: { userId: user.id } });
  if (!candidate || candidate.expiresAt <= new Date()) return null;
  const parts = /^code:([a-f0-9]{32}):([a-f0-9]{64})$/.exec(candidate.tokenHash);
  if (!parts) return null;
  // Absolute per-challenge limit: crossing a clock window never restores guesses.
  const attempts = await prisma.authRateLimit.upsert({
    where: { key: digest("reset-code-attempt:" + candidate.tokenHash) },
    create: { key: digest("reset-code-attempt:" + candidate.tokenHash), count: 1, expiresAt: candidate.expiresAt },
    update: { count: { increment: 1 } },
  });
  if (attempts.count > 5) return null;
  if (!timingSafeEqual(Buffer.from(parts[2], "hex"), Buffer.from(codeDigest(user.id, parts[1], code), "hex"))) return null;
  return consumeHash(candidate.tokenHash, password);
}

async function consumeHash(tokenHash: string, password: string) {
  const candidate = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!candidate || candidate.expiresAt <= new Date()) return null;
  const hashedPassword = await bcrypt.hash(password, 12);
  return prisma.$transaction(async (tx) => {
    // Claim and password update are one transaction, so only one caller wins.
    const claimed = await tx.passwordResetToken.deleteMany({
      where: { tokenHash, expiresAt: { gt: new Date() } },
    });
    if (claimed.count !== 1) return null;
    const user = await tx.user.update({
      where: { id: candidate.userId },
      data: { hashedPassword, passwordVersion: { increment: 1 } },
      select: { email: true },
    });
    await tx.session.deleteMany({ where: { userId: candidate.userId } });
    return user;
  });
}

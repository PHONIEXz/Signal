import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { passwordError, sessionVersionMatches } from "./auth-policy.ts";
import { readAuthBody, AuthInputError } from "./auth-http.ts";
import { emailDeliveryReady, resetOrigin } from "./reset-config.ts";

// Never load .env or use a developer's database. Every run migrates fresh storage.
const directory = mkdtempSync(join(tmpdir(), "signal-reset-test-"));
process.env.DATABASE_URL = "file:" + join(directory, "test.db");
process.env.DATABASE_PROVIDER = "sqlite";
delete process.env.VERCEL;
process.env.APP_URL = "https://signal.example";
process.env.EMAIL_PROVIDER = "disabled";
const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const db = new Database(join(directory, "test.db"));
const migrations = new URL("../prisma/migrations/", import.meta.url);
for (const migration of readdirSync(migrations).sort()) {
  if (migration === "migration_lock.toml") continue;
  db.exec(readFileSync(new URL(migration + "/migration.sql", migrations), "utf8"));
}
db.close();
const { prisma } = await import("./prisma.ts");
const { issueResetLink, consumeResetToken, digest, takeAuthQuota, findPasswordUser } = await import("./password-reset.ts");
const { sendResetEmail } = await import("./reset-email.ts");
after(async () => { await prisma.$disconnect(); rmSync(directory, { recursive: true, force: true }); });
const nextPassword = "cloud river signal lantern";
const tokenFrom = (url: string) => new URLSearchParams(new URL(url).hash.slice(1)).get("token")!;
let index = 0;
async function passwordUser() {
  return prisma.user.create({ data: { email: "Reset" + (++index) + "@example.com", hashedPassword: await bcrypt.hash("old-password", 4) } });
}

test("only a hash is stored; successful reset consumes token, changes password and revokes sessions", async () => {
  const user = await passwordUser();
  await prisma.session.create({ data: { userId: user.id, sessionToken: "old-session", expires: new Date(Date.now() + 60000) } });
  const issued = await issueResetLink(user.email.toLowerCase());
  assert.ok(issued);
  const token = tokenFrom(issued.url);
  const row = await prisma.passwordResetToken.findUniqueOrThrow({ where: { userId: user.id } });
  assert.equal(row.tokenHash, digest(token));
  assert.notEqual(row.tokenHash, token);
  assert.ok(row.expiresAt.getTime() > Date.now() + 29 * 60000);
  assert.equal(new URL(issued.url).search, "");
  assert.ok(await consumeResetToken(token, nextPassword));
  const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  assert.ok(await bcrypt.compare(nextPassword, updated.hashedPassword!));
  assert.equal(await bcrypt.compare("old-password", updated.hashedPassword!), false);
  assert.equal(updated.passwordVersion, 1);
  assert.equal(sessionVersionMatches(0, updated.passwordVersion), false);
  assert.equal(sessionVersionMatches(1, updated.passwordVersion), true);
  assert.equal(await prisma.session.count({ where: { userId: user.id } }), 0);
  assert.equal(await consumeResetToken(token, nextPassword), null);
});

test("expired and replaced tokens fail without modifying credentials", async () => {
  const user = await passwordUser();
  const first = await issueResetLink(user.email);
  const second = await issueResetLink(user.email);
  assert.ok(first && second);
  assert.equal(await consumeResetToken(tokenFrom(first.url), nextPassword), null);
  await prisma.passwordResetToken.update({ where: { userId: user.id }, data: { expiresAt: new Date(0) } });
  assert.equal(await consumeResetToken(tokenFrom(second.url), nextPassword), null);
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).passwordVersion, 0);
});

test("two simultaneous submissions cannot both redeem one link", async () => {
  const user = await passwordUser();
  const issued = await issueResetLink(user.email);
  assert.ok(issued);
  const outcomes = await Promise.all([consumeResetToken(tokenFrom(issued.url), nextPassword), consumeResetToken(tokenFrom(issued.url), nextPassword)]);
  assert.equal(outcomes.filter(Boolean).length, 1);
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).passwordVersion, 1);
});

test("unknown, Google-only, and ambiguous case variants do not receive reset tokens", async () => {
  assert.equal(await issueResetLink("absent@example.com"), null);
  await prisma.user.create({ data: { email: "google@example.com" } });
  assert.equal(await issueResetLink("google@example.com"), null);
  const user = await passwordUser();
  await prisma.user.create({ data: { email: user.email.toLowerCase(), hashedPassword: user.hashedPassword } });
  assert.equal(await findPasswordUser(user.email), null);
  assert.equal(await issueResetLink(user.email), null);
});

test("persistent quotas enforce concurrent limits and expire old records", async () => {
  await prisma.authRateLimit.create({ data: { key: "expired", count: 999, expiresAt: new Date(0) } });
  const outcomes = await Promise.all(Array.from({ length: 8 }, () => takeAuthQuota("test", "sample", 3, 3600000)));
  assert.equal(outcomes.filter(Boolean).length, 3);
  assert.equal(await prisma.authRateLimit.count({ where: { key: "expired" } }), 0);
});

test("password policy catches bcrypt truncation and accepts long passphrases", () => {
  assert.ok(passwordError("short"));
  assert.ok(passwordError("😀".repeat(19)));
  assert.ok(passwordError({}));
  assert.equal(passwordError(nextPassword), null);
  assert.equal(passwordError("x".repeat(72)), null);
  assert.ok(passwordError("x".repeat(73)));
  assert.equal(sessionVersionMatches(undefined, 0), true);
  assert.equal(sessionVersionMatches(undefined, 1), false);
});

test("HTTP boundary rejects untrusted origins, oversized streams and malformed input", async () => {
  const request = (body: string, origin = "https://signal.example", type = "application/json") => new Request("https://signal.example/api/auth/reset-password", {
    method: "POST", headers: { "Content-Type": type, Origin: origin }, body,
  });
  assert.deepEqual(await readAuthBody(request('{"email":"person@example.com"}')), { email: "person@example.com" });
  for (const [req, status] of [
    [request("{}", "https://other.example"), 403],
    [request("{}", "null"), 403],
    [request("{}", "https://signal.example", "text/plain"), 415],
    [request("{"), 400],
    [request("[]"), 400],
    [request(JSON.stringify({ text: "x".repeat(5000) })), 413],
  ] as const) {
    await assert.rejects(readAuthBody(req), (error: unknown) => error instanceof AuthInputError && error.status === status);
  }
});

test("email adapter is explicitly enabled, sends the expected request and handles provider rejection", async () => {
  assert.equal(emailDeliveryReady(), false);
  await assert.rejects(sendResetEmail("test@example.com", "https://signal.example/reset-password#token=test"));
  process.env.EMAIL_PROVIDER = "resend";
  process.env.RESEND_API_KEY = "test-only-key";
  process.env.EMAIL_FROM = "Signal <security@example.com>";
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, "https://api.resend.com/emails");
      assert.equal(init?.method, "POST");
      const payload = JSON.parse(init?.body as string);
      assert.deepEqual(payload.to, ["test@example.com"]);
      assert.match(payload.text, /reset-password#token=test/);
      return Response.json({ id: "test" });
    };
    await sendResetEmail("test@example.com", "https://signal.example/reset-password#token=test");
    globalThis.fetch = async () => new Response("private provider detail", { status: 429 });
    await assert.rejects(sendResetEmail("test@example.com", "private reset link"), { message: "Email provider rejected delivery (429)" });
  } finally { globalThis.fetch = original; process.env.EMAIL_PROVIDER = "disabled"; }
});

test("reset origin cannot be a relative URL, include credentials or supply an arbitrary path", () => {
  for (const value of ["null", "https://signal.example/evil", "https://user:pass@signal.example", "http://public.example", "https://signal.example?host=evil"]) {
    process.env.APP_URL = value;
    assert.throws(resetOrigin);
  }
  process.env.APP_URL = "https://signal.example";
  assert.equal(resetOrigin(), "https://signal.example");
});

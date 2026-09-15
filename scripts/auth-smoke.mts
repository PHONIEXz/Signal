import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";

// Run after npm run build. Never uses .env or sends email.
const folder = mkdtempSync(join(tmpdir(), "signal-http-test-"));
process.env.DATABASE_URL = "file:" + join(folder, "test.db");
process.env.DATABASE_PROVIDER = "sqlite";
delete process.env.VERCEL;
process.env.APP_URL = "https://signal.example";
process.env.EMAIL_PROVIDER = "disabled";
process.env.AUTH_SECRET = randomBytes(32).toString("hex");
const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const db = new Database(join(folder, "test.db"));
const migrations = new URL("../prisma/migrations/", import.meta.url);
for (const migration of readdirSync(migrations).sort()) {
  if (migration !== "migration_lock.toml") db.exec(readFileSync(new URL(migration + "/migration.sql", migrations), "utf8"));
}
db.close();
const { prisma } = await import("../lib/prisma.ts");
const { issueResetLink, issueResetCode } = await import("../lib/password-reset.ts");
const allocator = createServer();
allocator.listen(0, "127.0.0.1");
await once(allocator, "listening");
const address = allocator.address();
assert.ok(address && typeof address !== "string");
const port = address.port;
await new Promise<void>((resolve) => allocator.close(() => resolve()));
const base = "http://127.0.0.1:" + port;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(port)], {
  cwd: new URL("../", import.meta.url),
  env: { ...process.env, NODE_ENV: "production", AUTH_TRUST_HOST: "true", AUTH_URL: base, NEXTAUTH_URL: base, NEXT_TELEMETRY_DISABLED: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});
// Read streams without printing account/cookie/credential diagnostics.
server.stderr.resume();
const ready = new Promise<void>((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error("Test server did not become ready")), 20000);
  server.stdout.on("data", (chunk) => {
    if (chunk.toString().includes("Ready")) { clearTimeout(timeout); resolve(); }
  });
  server.on("exit", (code) => { clearTimeout(timeout); reject(new Error("Test server exited: " + code)); });
});

const json = (path: string, body: object, origin = process.env.APP_URL!) => fetch(base + path, {
  method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(body),
});
const email = "smoke@example.com";
const oldPassword = "original signal passphrase";
const newPassword = "updated signal passphrase";

async function login(password: string) {
  const jar = new Map<string, string>();
  function accept(response: Response) {
    for (const cookie of response.headers.getSetCookie()) {
      const part = cookie.split(";")[0];
      const split = part.indexOf("=");
      jar.set(part.slice(0, split), part.slice(split + 1));
    }
  }
  const cookie = () => [...jar].map(([key, value]) => key + "=" + value).join("; ");
  const csrf = await fetch(base + "/api/auth/csrf");
  accept(csrf);
  const { csrfToken } = await csrf.json();
  const response = await fetch(base + "/api/auth/callback/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie(), "X-Auth-Return-Redirect": "1", Origin: base },
    body: new URLSearchParams({ email, password, csrfToken, callbackUrl: base + "/dashboard" }),
    redirect: "manual",
  });
  accept(response);
  return cookie();
}

try {
  await ready;
  for (const route of ["/login", "/forgot-password", "/reset-password"]) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes("/signal-icon.svg"));
    if (route !== "/login") assert.ok(html.includes('content="no-referrer"'));
  }
  assert.equal((await fetch(base + "/favicon.ico")).status, 200);
  assert.equal((await json("/api/signup", { email, password: "short" })).status, 400);
  assert.equal((await json("/api/signup", { email, password: oldPassword, name: "Test creator" })).status, 200);
  assert.equal((await json("/api/signup", { email: email.toUpperCase(), password: oldPassword })).status, 409);
  const providers = await (await fetch(base + "/api/auth/providers")).json();
  assert.equal(providers.google, undefined);
  const sessionOne = await login(oldPassword);
  const sessionTwo = await login(oldPassword);
  const session = async (cookie: string) => (await fetch(base + "/api/auth/session", { headers: { Cookie: cookie } })).json();
  assert.equal((await session(sessionOne)).user.email, email);
  assert.equal((await session(sessionTwo)).user.email, email);
  const disabled = await json("/api/auth/forgot-password", { email });
  assert.equal(disabled.status, 503);
  assert.equal(disabled.headers.get("cache-control"), "no-store");
  const issued = await issueResetLink(email);
  assert.ok(issued);
  const token = new URLSearchParams(new URL(issued.url).hash.slice(1)).get("token");
  const payload = { token, password: newPassword, confirmPassword: newPassword };
  assert.equal((await json("/api/auth/reset-password", payload, "https://untrusted.example")).status, 403);
  assert.equal((await json("/api/auth/reset-password", { ...payload, confirmPassword: "different" })).status, 400);
  assert.equal((await json("/api/auth/reset-password", payload)).status, 200);
  assert.equal((await json("/api/auth/reset-password", payload)).status, 400);
  assert.equal((await session(sessionOne))?.user, undefined);
  assert.equal((await session(sessionTwo))?.user, undefined);
  assert.equal((await session(await login(oldPassword)))?.user, undefined);
  assert.equal((await session(await login(newPassword))).user.email, email);
  const activeOne = await login(newPassword);
  const owner = await prisma.user.findUniqueOrThrow({ where: { email } });
  const target = await prisma.connectedAccount.create({ data: { userId: owner.id, platform: "tiktok", displayName: "Test TikTok", accessToken: "test-only" } });
  const draftRequest = (path: string, body: object, method = "POST", cookie = activeOne) => fetch(base + path, {
    method, headers: { "Content-Type": "application/json", Origin: process.env.APP_URL!, Cookie: cookie }, body: JSON.stringify(body),
  });
  const draftPayload = { text: "A test-only draft", targetIds: [target.id], mediaUrl: "", scheduledFor: null };
  assert.equal((await draftRequest("/api/drafts", { ...draftPayload, mediaUrl: "javascript:alert(1)" })).status, 400);
  const saved = await draftRequest("/api/drafts", draftPayload); assert.equal(saved.status, 201);
  const draft = await saved.json(); assert.deepEqual(draft.publications, []);
  assert.equal((await draftRequest(`/api/drafts/${draft.id}/publish`, { accountId: target.id, confirm: true }, "POST", "")).status, 401);
  assert.equal((await draftRequest(`/api/drafts/${draft.id}/publish`, { accountId: target.id })).status, 400);
  assert.equal((await draftRequest(`/api/drafts/${draft.id}/publish`, { accountId: target.id, confirm: true })).status, 409);
  await prisma.contentPublication.create({ data: { contentDraftId: draft.id, connectedAccountId: target.id, status: "PUBLISHING" } });
  assert.equal((await draftRequest(`/api/drafts/${draft.id}`, { ...draftPayload, text: "Do not overwrite" }, "PATCH")).status, 409);
  assert.equal((await fetch(base + `/api/drafts/${draft.id}`, { method: "DELETE", headers: { Cookie: activeOne, Origin: process.env.APP_URL! } })).status, 409);
  assert.equal((await prisma.contentDraft.findUniqueOrThrow({ where: { id: draft.id } })).text, draftPayload.text);
  const settings = await (await fetch(base + "/api/settings", { headers: { Cookie: activeOne } })).json();
  assert.equal(settings.hasPassword, true); assert.equal(settings.hashedPassword, undefined);
  const activeTwo = await login(newPassword);
  const change = (body: object, cookie = activeOne, origin = process.env.APP_URL!) => fetch(base + "/api/auth/change-password", {
    method: "POST", headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookie }, body: JSON.stringify(body),
  });
  const finalPassword = "a final signal passphrase";
  const updated = { currentPassword: newPassword, password: finalPassword, confirmPassword: finalPassword };
  assert.equal((await change(updated, "")).status, 401);
  assert.equal((await change(updated, activeOne, "https://untrusted.example")).status, 403);
  assert.equal((await change({ ...updated, currentPassword: "wrong" })).status, 400);
  assert.equal((await change(updated)).status, 200);
  assert.equal((await session(activeOne))?.user, undefined);
  assert.equal((await session(activeTwo))?.user, undefined);
  assert.equal((await session(await login(newPassword)))?.user, undefined);
  assert.equal((await session(await login(finalPassword))).user.email, email);
  const beforeCode = await login(finalPassword);
  const codeReset = await issueResetCode(email); assert.ok(codeReset);
  const codePassword = "email code signal passphrase";
  const codePayload = { email, code: codeReset.code, password: codePassword, confirmPassword: codePassword };
  assert.equal((await json("/api/auth/forgot-password", { email, method: "sms" })).status, 400);
  assert.equal((await json("/api/auth/forgot-password", { email, method: "code" })).status, 503);
  assert.equal((await json("/api/auth/reset-password", codePayload, "https://untrusted.example")).status, 403);
  assert.equal((await json("/api/auth/reset-password", { ...codePayload, token: "a".repeat(64) })).status, 400);
  assert.equal((await json("/api/auth/reset-password", { ...codePayload, confirmPassword: "different" })).status, 400);
  assert.equal((await json("/api/auth/reset-password", codePayload)).status, 200);
  assert.equal((await json("/api/auth/reset-password", codePayload)).status, 400);
  assert.equal((await session(beforeCode))?.user, undefined);
  assert.equal((await session(await login(codePassword))).user.email, email);
  console.log("HTTP smoke passed: email code/reset/reuse/session revocation, draft validation/history, optional Google, password changes, forms/icons and sign-in.");
} finally {
  server.kill("SIGTERM");
  if (server.exitCode === null) await once(server, "exit");
  await prisma.$disconnect();
  rmSync(folder, { recursive: true, force: true });
}

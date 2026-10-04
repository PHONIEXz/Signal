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
process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
process.env.SIGNAL_METRICS_FREE_DAILY = "8";
process.env.YOUTUBE_CLIENT_ID="signal-test-client";
process.env.YOUTUBE_CLIENT_SECRET="signal-test-secret";
process.env.FACEBOOK_APP_ID="signal-test-app";
process.env.FACEBOOK_APP_SECRET="signal-test-secret";
process.env.INSTAGRAM_FACEBOOK_CONFIG_ID="signal-test-config";
const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const db = new Database(join(folder, "test.db"));
const migrations = new URL("../prisma/migrations/", import.meta.url);
for (const migration of readdirSync(migrations).sort()) {
  if (migration !== "migration_lock.toml") db.exec(readFileSync(new URL(migration + "/migration.sql", migrations), "utf8"));
}
db.close();
const { prisma } = await import("../lib/prisma.ts");
const { encrypt } = await import("../lib/encryption.ts");
const { issueResetLink, issueResetCode } = await import("../lib/password-reset.ts");
const allocator = createServer();
allocator.listen(0, "127.0.0.1");
await once(allocator, "listening");
const address = allocator.address();
assert.ok(address && typeof address !== "string");
const port = address.port;
await new Promise<void>((resolve) => allocator.close(() => resolve()));
const base = "http://127.0.0.1:" + port;
const server = spawn(process.execPath, ["--import", new URL("./fixtures/metric-providers.mjs", import.meta.url).pathname, "node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(port)], {
  cwd: new URL("../", import.meta.url),
  env: { ...process.env, NODE_ENV: "production", SIGNAL_METRIC_HTTP_FIXTURES: "1", AUTH_TRUST_HOST: "true", AUTH_URL: base, NEXTAUTH_URL: base, NEXT_TELEMETRY_DISABLED: "1" },
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
  const patchPath = `/api/drafts/${draft.id}`;
  assert.equal((await draftRequest(patchPath, draftPayload, "PATCH")).status, 428);
  const versioned = { ...draftPayload, expectedUpdatedAt: draft.updatedAt };
  const revisedResponse = await draftRequest(patchPath, { ...versioned, text: "A newer saved draft" }, "PATCH");
  assert.equal(revisedResponse.status, 200);
  const revised = await revisedResponse.json();
  assert.notEqual(revised.updatedAt, draft.updatedAt);
  const conflict = await draftRequest(patchPath, { ...versioned, text: "An outdated tab" }, "PATCH");
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).code, "DRAFT_CONFLICT");
  assert.equal((await prisma.contentDraft.findUniqueOrThrow({ where: { id: draft.id } })).text, revised.text);
  assert.equal((await draftRequest(`/api/drafts/${draft.id}/publish`, { accountId: target.id, confirm: true }, "POST", "")).status, 401);
  assert.equal((await draftRequest(`/api/drafts/${draft.id}/publish`, { accountId: target.id })).status, 400);
  assert.equal((await draftRequest(`/api/drafts/${draft.id}/publish`, { accountId: target.id, confirm: true })).status, 409);
  await prisma.contentPublication.create({ data: { contentDraftId: draft.id, connectedAccountId: target.id, status: "PUBLISHING" } });
  assert.equal((await draftRequest(`/api/drafts/${draft.id}`, { ...draftPayload, expectedUpdatedAt: revised.updatedAt, text: "Do not overwrite" }, "PATCH")).status, 409);
  assert.equal((await fetch(base + `/api/drafts/${draft.id}`, { method: "DELETE", headers: { Cookie: activeOne, Origin: process.env.APP_URL! } })).status, 409);
  assert.equal((await prisma.contentDraft.findUniqueOrThrow({ where: { id: draft.id } })).text, revised.text);
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
  const studioSession = await login(codePassword);
  assert.equal((await session(studioSession)).user.email, email);
  assert.equal((await fetch(base + "/dashboard/content", { headers: { Cookie: studioSession } })).status, 200);
  const xAccount = await prisma.connectedAccount.create({ data: { userId: owner.id, platform: "x", platformUserId: "123", displayName: "Fixture X", accessToken: "test-only" } });
  const metricRequest = (path: string, body: object, cookie = studioSession, origin = base) => fetch(base + path, {
    method: "POST", headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookie }, body: JSON.stringify(body),
  });
  const csvBody = { csv: "platform_post_id,text,likes,views,comments,shares,quotes\n987,Imported fixture,0,,1,0,0", capturedAt: new Date().toISOString() };
  assert.equal((await metricRequest("/api/metrics/refresh/x", {}, "")).status, 401);
  assert.equal((await metricRequest("/api/metrics/import/x", csvBody, studioSession, "https://untrusted.example")).status, 403);
  assert.equal((await metricRequest("/api/metrics/import/x", csvBody)).status, 200);
  assert.equal(await prisma.post.count(), 0);
  assert.equal((await metricRequest("/api/metrics/import/x", { ...csvBody, confirm: true })).status, 200);
  const imported = await prisma.post.findFirstOrThrow({ where: { connectedAccountId: xAccount.id } });
  assert.equal(imported.likeCount, 0); assert.equal(imported.viewCount, null);
  assert.equal(await prisma.metricSnapshot.count(), 0);
  assert.equal((await metricRequest("/api/metrics/import/x", { ...csvBody, confirm: true })).status, 429);
  const cached = await metricRequest("/api/metrics/refresh/x", {});
  assert.equal(cached.status, 200); assert.equal((await cached.json()).cached, true);
  assert.equal(await prisma.postMeasurement.count(), 1);
  const postsPage = await fetch(base + "/dashboard/posts/x", { headers: { Cookie: studioSession } });
  assert.equal(postsPage.status, 200);
  assert.match(await postsPage.text(), /Measurement history/);
  // Full refresh flow with isolated provider responses and encrypted dummy tokens.
  const allowRefresh = () => prisma.metricSync.update({ where: { connectedAccountId: xAccount.id }, data: { nextAllowedAt: null } });
  await prisma.connectedAccount.update({ where: { id: xAccount.id }, data: { accessToken: encrypt("signal-metric-fixture-credits") } });
  await allowRefresh();
  const creditFailure = await metricRequest("/api/metrics/refresh/x", {});
  assert.equal(creditFailure.status, 502);
  assert.equal((await creditFailure.json()).code, "METRIC_CREDITS");
  assert.equal(await prisma.post.count({ where: { connectedAccountId: xAccount.id } }), 1);
  const failedSync = await prisma.metricSync.findUniqueOrThrow({ where: { connectedAccountId: xAccount.id } });
  assert.equal(failedSync.source, "CSV");
  assert.match(failedSync.warning!, /credit/i);
  assert.ok(failedSync.lastSuccessAt);
  const cachedFailure = await (await metricRequest("/api/metrics/refresh/x", {})).json();
  assert.equal(cachedFailure.cached, true); assert.match(cachedFailure.warning, /credit/i);
  await prisma.connectedAccount.update({ where: { id: xAccount.id }, data: { accessToken: encrypt("signal-metric-fixture-posts") } });
  await allowRefresh();
  const postOnly = await metricRequest("/api/metrics/refresh/x", {});
  assert.equal(postOnly.status, 200);
  assert.match((await postOnly.json()).warning, /Follower counters/);
  assert.equal(await prisma.metricSnapshot.count(), 0);
  assert.equal((await prisma.post.findFirstOrThrow({ where: { platformPostId: "999" } })).likeCount, 9);
  const metricPage = await fetch(base + "/dashboard/accounts/x", { headers: { Cookie: studioSession } });
  assert.equal(metricPage.status, 200);
  const metricHtml = await metricPage.text();
  assert.match(metricHtml, /Sample likes/); assert.match(metricHtml, /Newest selected post measurement/);
  assert.match(metricHtml, /Unavailable/); assert.match(metricHtml, /Fresh API fixture/);
  assert.match(metricHtml, />9<\/p>/);
  await prisma.connectedAccount.update({ where: { id: target.id }, data: { platformUserId: "tt-fixture", accessToken: encrypt("signal-metric-fixture-scope") } });
  const scoped = await metricRequest("/api/metrics/refresh/tiktok", {});
  assert.equal(scoped.status, 200); assert.match((await scoped.json()).warning, /user.info.stats/);
  assert.equal((await prisma.post.findFirstOrThrow({ where: { connectedAccountId: target.id } })).viewCount, 60);
  const facebookFixture = await prisma.connectedAccount.create({ data: { userId: owner.id, platform: "facebook", platformUserId: "456", accessToken: encrypt("signal-metric-fixture-invalid") } });
  const expired = await metricRequest("/api/metrics/refresh/facebook", {});
  assert.equal(expired.status, 502); assert.equal((await expired.json()).code, "METRIC_RECONNECT");
  assert.equal(await prisma.post.count({ where: { connectedAccountId: facebookFixture.id } }), 0);
  await prisma.connectedAccount.delete({ where: { id: facebookFixture.id } });
  const instagramFixture=await prisma.connectedAccount.create({data:{userId:owner.id,platform:"instagram",platformUserId:"ig-fixture",accessToken:encrypt("signal-metric-fixture-instagram")}});
  const youtubeFixture=await prisma.connectedAccount.create({data:{userId:owner.id,platform:"youtube",platformUserId:"yt-fixture",expiresAt:new Date(Date.now()+3600000),accessToken:encrypt("signal-metric-fixture-youtube")}});
  assert.equal((await metricRequest("/api/metrics/refresh/instagram",{},studioSession,"https://untrusted.example")).status,403);
  const instagramMetrics=await metricRequest("/api/metrics/refresh/instagram",{});assert.equal(instagramMetrics.status,200);
  const instagramPost=await prisma.post.findFirstOrThrow({where:{connectedAccountId:instagramFixture.id}});
  assert.equal(instagramPost.likeCount,0);assert.equal(instagramPost.replyCount,2);assert.equal(instagramPost.viewCount,null);
  assert.equal((await prisma.metricSync.findUniqueOrThrow({where:{connectedAccountId:instagramFixture.id}})).status,"AVAILABLE");
  const instagramPage=await fetch(base+"/dashboard/accounts/instagram",{headers:{Cookie:studioSession}});assert.equal(instagramPage.status,200);assert.match(await instagramPage.text(),/Recent media/);
  const youtubePage=await fetch(base+"/dashboard/accounts/youtube",{headers:{Cookie:studioSession}});assert.equal(youtubePage.status,200);assert.match(await youtubePage.text(),/YouTube analytics/);
  assert.equal((await metricRequest("/api/metrics/refresh/youtube",{days:400})).status,400);
  const youtubeMetrics=await metricRequest("/api/metrics/refresh/youtube",{days:7});assert.equal(youtubeMetrics.status,200);assert.equal(youtubeMetrics.headers.get("cache-control"),"no-store");
  const youtubeData=await youtubeMetrics.json();assert.equal(youtubeData.youtube.posts[0].viewCount,5000000000);assert.equal(youtubeData.youtube.profile.followers,null);assert.equal(youtubeData.youtube.analytics.reports.overview.rows[0][3],45.25);
  assert.equal(await prisma.post.count({where:{connectedAccountId:youtubeFixture.id}}),0);assert.equal(await prisma.metricSnapshot.count({where:{connectedAccountId:youtubeFixture.id}}),0);
  const youtubeStart=await fetch(base+"/api/connect/youtube/start",{headers:{Cookie:studioSession},redirect:"manual"});assert.equal(youtubeStart.status,307);
  const youtubeAuth=new URL(youtubeStart.headers.get("location")!);assert.equal(youtubeAuth.hostname,"accounts.google.com");assert.equal(youtubeAuth.searchParams.get("code_challenge_method"),"S256");assert.ok(!youtubeAuth.searchParams.get("scope")!.includes("monetary"));
  const stateCookies=youtubeStart.headers.getSetCookie();assert.ok(stateCookies.some(cookie=>cookie.startsWith("youtube_state=")&&cookie.includes("HttpOnly")));assert.ok(stateCookies.some(cookie=>cookie.startsWith("youtube_verifier=")));
  const oauthCookies=studioSession+"; "+stateCookies.map(cookie=>cookie.split(";")[0]).join("; ");
  const wrongState=await fetch(base+"/api/connect/youtube/callback?state=wrong&code=signal-oauth-fixture",{headers:{Cookie:oauthCookies},redirect:"manual"});assert.match(wrongState.headers.get("location")!,/youtube_authorization_failed/);
  const partialPermission=await fetch(base+`/api/connect/youtube/callback?state=${youtubeAuth.searchParams.get("state")}&code=signal-oauth-fixture-partial`,{headers:{Cookie:oauthCookies},redirect:"manual"});assert.match(partialPermission.headers.get("location")!,/youtube_permissions_required/);
  const authorized=await fetch(base+`/api/connect/youtube/callback?state=${youtubeAuth.searchParams.get("state")}&code=signal-oauth-fixture`,{headers:{Cookie:oauthCookies},redirect:"manual"});assert.match(authorized.headers.get("location")!,/connected=youtube/);assert.equal(authorized.headers.get("referrer-policy"),"no-referrer");
  const encryptedYoutube=await prisma.connectedAccount.findUniqueOrThrow({where:{id:youtubeFixture.id}});assert.notEqual(encryptedYoutube.accessToken,"signal-metric-fixture-youtube");assert.ok(encryptedYoutube.refreshToken);
  const instagramStart=await fetch(base+"/api/connect/instagram/start",{headers:{Cookie:studioSession},redirect:"manual"});assert.equal(new URL(instagramStart.headers.get("location")!).searchParams.get("config_id"),"signal-test-config");
  const igAuth=new URL(instagramStart.headers.get("location")!);const igCookies=studioSession+"; "+instagramStart.headers.getSetCookie().map(cookie=>cookie.split(";")[0]).join("; ");
  const igAuthorized=await fetch(base+`/api/connect/instagram/callback?state=${igAuth.searchParams.get("state")}&code=signal-oauth-instagram`,{headers:{Cookie:igCookies},redirect:"manual"});assert.match(igAuthorized.headers.get("location")!,/connected=instagram/);assert.ok((await prisma.connectedAccount.findUniqueOrThrow({where:{id:instagramFixture.id}})).expiresAt!.getTime()>Date.now()+5000000000);
  assert.equal((await fetch(base+"/api/connect/instagram",{method:"DELETE",headers:{Cookie:studioSession,Origin:"https://untrusted.example"}})).status,403);
  const unlinked=await fetch(base+"/api/connect/youtube",{method:"DELETE",headers:{Cookie:studioSession,Origin:base}});assert.equal(unlinked.status,200);assert.equal(await prisma.connectedAccount.count({where:{id:youtubeFixture.id}}),0);
  await prisma.connectedAccount.delete({where:{id:instagramFixture.id}});
  const other = await prisma.user.create({ data: { email: "other-owner@example.com" } });
  await prisma.connectedAccount.create({ data: { userId: other.id, platform: "facebook", accessToken: "test-only" } });
  assert.equal((await metricRequest("/api/metrics/import/facebook", csvBody)).status, 404);
  await prisma.authRateLimit.update({ where: { key: `usage:metrics:user:${owner.id}:${new Date().toISOString().slice(0,10)}` }, data: { count: 8 } });
  await allowRefresh();
  const allowance = await metricRequest("/api/metrics/refresh/x", {});
  assert.equal(allowance.status, 429);
  const allowanceBody = await allowance.json(); assert.match(allowanceBody.error, /allowance/);
  const allowanceSync = await prisma.metricSync.findUniqueOrThrow({ where: { connectedAccountId: xAccount.id } });
  assert.equal(allowanceSync.status, "LIMITED"); assert.match(allowanceSync.warning!, /allowance/);
  assert.equal(allowanceSync.nextAllowedAt?.toISOString(), allowanceBody.resetAt);
  await prisma.user.update({ where: { id: owner.id }, data: { analyticsCollectionEnabled: false } });
  assert.equal((await metricRequest("/api/metrics/refresh/x", {})).status, 403);
  await prisma.user.update({ where: { id: owner.id }, data: { analyticsCollectionEnabled: true } });
  await prisma.$executeRawUnsafe('DROP TABLE "MetricSync"');
  const metricsMissing = await metricRequest("/api/metrics/refresh/x", {});
  assert.equal(metricsMissing.status, 503); assert.equal((await metricsMissing.json()).code, "METRICS_SCHEMA_PENDING");
  await prisma.$executeRawUnsafe('DROP TABLE "ContentPublication"');
  const studioMissing = await fetch(base + "/dashboard/content", { headers: { Cookie: studioSession } });
  assert.equal(studioMissing.status, 200);
  assert.match(await studioMissing.text(), /Content Studio is temporarily unavailable/);
  const missingApi = await fetch(base + "/api/drafts", { headers: { Cookie: studioSession } });
  assert.equal(missingApi.status, 503);
  assert.equal((await missingApi.json()).code, "STUDIO_SCHEMA_PENDING");
  assert.equal((await draftRequest("/api/drafts", draftPayload, "POST", studioSession)).status, 503);
  console.log("HTTP smoke passed: Instagram collection, YouTube official reports/ownership/non-persistence/OAuth PKCE/state/revocation, provider credits/permissions/token errors, post-only metrics rendering, metrics import/ownership/cooldown/history/schema protection, email code/reset/reuse/session revocation, draft validation/history, optional Google, password changes, forms/icons and sign-in.");
} finally {
  server.kill("SIGTERM");
  if (server.exitCode === null) await once(server, "exit");
  await prisma.$disconnect();
  rmSync(folder, { recursive: true, force: true });
}

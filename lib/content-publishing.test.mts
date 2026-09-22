import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sendPost, PublishError, assistedPublishUrl, deliveryText } from "./content-publishing.ts";
const folder = mkdtempSync(join(tmpdir(), "signal-publishing-test-"));
process.env.DATABASE_PROVIDER = "sqlite";
process.env.DATABASE_URL = "file:" + join(folder, "test.db");
process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
delete process.env.VERCEL;
// Keep broad publishing regressions independent of small production allowances.
process.env.SIGNAL_PUBLISHING_FREE_DAILY = "100";
process.env.SIGNAL_PUBLISHING_GLOBAL_DAILY = "1000";
process.env.SIGNAL_PUBLISHING_GLOBAL_MONTHLY = "10000";
const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const db = new Database(join(folder, "test.db"));
const migrations = new URL("../prisma/migrations/", import.meta.url);
for (const name of readdirSync(migrations).sort()) if (name !== "migration_lock.toml") db.exec(readFileSync(new URL(name + "/migration.sql", migrations), "utf8"));
db.close();
const { prisma } = await import("./prisma.ts");
const { encrypt } = await import("./encryption.ts");
const { publishDraft } = await import("./publish-draft.ts");
after(async () => { await prisma.$disconnect(); rmSync(folder, { recursive: true, force: true }); });
let n = 0;
async function fixture(platform = "x") {
  const user = await prisma.user.create({ data: { email: `publish${++n}@example.com` } });
  const account = await prisma.connectedAccount.create({ data: { userId: user.id, platform, platformUserId: "123", accessToken: encrypt("test-token") } });
  const draft = await prisma.contentDraft.create({ data: { userId: user.id, text: "A useful update", targets: { create: { connectedAccountId: account.id } } } });
  return { user, account, draft };
}
const input = { platform: "x", platformUserId: "123", token: "test-token", text: "A useful update", mediaUrl: null };
test("X and Facebook use their own endpoints and send links as links", async () => {
  const x = await sendPost({ ...input, mediaUrl: "https://example.com/link" }, async (url, init) => {
    assert.equal(url, "https://api.x.com/2/tweets"); assert.equal(init?.method, "POST");
    assert.equal(JSON.parse(init?.body as string).text, "A useful update\n\nhttps://example.com/link");
    return Response.json({ data: { id: "101" } });
  });
  assert.equal(x.permalinkUrl, "https://x.com/i/status/101");
  await sendPost({ ...input, platform: "facebook", mediaUrl: "https://example.com/link" }, async (url, init) => {
    assert.equal(url, "https://graph.facebook.com/v26.0/123/feed");
    const body = new URLSearchParams(init?.body as string);
    assert.equal(body.get("message"), input.text); assert.equal(body.get("link"), "https://example.com/link");
    assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer test-token");
    return Response.json({ id: "123_202" });
  });
});
test("rejections allow correction; timeouts and malformed receipts require checking", async () => {
  for (const [status, code] of [[401, "PERMISSION_REQUIRED"], [402, "BILLING_REQUIRED"], [429, "RATE_LIMITED"], [400, "FAILED"], [503, "UNKNOWN"]] as const) {
    await assert.rejects(sendPost(input, async () => new Response("private detail", { status })), (error: unknown) => error instanceof PublishError && error.code === code && !error.message.includes("private"));
  }
  await assert.rejects(sendPost(input, async () => { throw new Error("private token"); }), (error: unknown) => error instanceof PublishError && error.code === "UNKNOWN");
  await assert.rejects(sendPost(input, async () => Response.json({})), (error: unknown) => error instanceof PublishError && error.code === "UNKNOWN");
  await assert.rejects(sendPost({ ...input, text: "x".repeat(281) }), PublishError);
  await assert.rejects(sendPost({ ...input, mediaUrl: "javascript:alert(1)" }), PublishError);
  assert.equal(deliveryText("https://example.com", "https://example.com"), "https://example.com");
  assert.match(assistedPublishUrl("x", "My update", null), /^https:\/\/x.com\/intent\/post/);
});
test("concurrent clicks send once; published retries return the receipt; analytics are untouched", async () => {
  const { user, account, draft } = await fixture();
  let calls = 0; let release!: () => void; let entered!: () => void;
  const started = new Promise<void>((resolve) => { entered = resolve; });
  const hold = new Promise<void>((resolve) => { release = resolve; });
  const request: typeof fetch = async () => { calls++; entered(); await hold; return Response.json({ data: { id: "303" } }); };
  const first = publishDraft(user.id, draft.id, account.id, request);
  await started;
  await assert.rejects(publishDraft(user.id, draft.id, account.id, request), PublishError);
  release();
  const receipt = await first;
  assert.equal((await publishDraft(user.id, draft.id, account.id, request)).id, receipt.id);
  assert.equal(calls, 1);
  assert.equal((await prisma.contentDraft.findUniqueOrThrow({ where: { id: draft.id } })).status, "PUBLISHED");
  assert.equal(await prisma.post.count(), 0); assert.equal(await prisma.metricSnapshot.count(), 0);
});
test("timeouts stay locked; definitive rejection can be corrected and retried", async () => {
  const { user, account, draft } = await fixture(); let calls = 0;
  const timeout: typeof fetch = async () => { calls++; throw new Error("timeout"); };
  await assert.rejects(publishDraft(user.id, draft.id, account.id, timeout));
  assert.equal((await prisma.contentPublication.findFirstOrThrow({ where: { contentDraftId: draft.id } })).status, "UNKNOWN");
  await assert.rejects(publishDraft(user.id, draft.id, account.id, timeout)); assert.equal(calls, 1);
  const other = await fixture();
  await assert.rejects(publishDraft(other.user.id, other.draft.id, other.account.id, async () => new Response(null, { status: 403 })));
  await publishDraft(other.user.id, other.draft.id, other.account.id, async () => Response.json({ data: { id: "404" } }));
  assert.equal((await prisma.contentDraft.findUniqueOrThrow({ where: { id: other.draft.id } })).status, "PUBLISHED");
});
test("cross-user accounts and TikTok cannot trigger remote publishing", async () => {
  const x = await fixture(); const tiktok = await fixture("tiktok");
  const never: typeof fetch = async () => { assert.fail("Must not contact a platform"); };
  await assert.rejects(publishDraft(tiktok.user.id, x.draft.id, x.account.id, never), PublishError);
  await assert.rejects(publishDraft(tiktok.user.id, tiktok.draft.id, tiktok.account.id, never), PublishError);
});
test("receipt storage failure after remote acceptance leaves the delivery locked", async () => {
  const { user, account, draft } = await fixture();
  const transaction = prisma.$transaction.bind(prisma); let accepted = false;
  prisma.$transaction = ((...args: Parameters<typeof transaction>) => {
    if (accepted) throw new Error("storage unavailable");
    return transaction(...args);
  }) as typeof prisma.$transaction;
  try {
    await assert.rejects(publishDraft(user.id, draft.id, account.id, async () => { accepted = true; return Response.json({ data: { id: "505" } }); }), (error: unknown) => error instanceof PublishError && error.code === "CHECK_PLATFORM");
  } finally { prisma.$transaction = transaction; }
  assert.equal((await prisma.contentPublication.findFirstOrThrow({ where: { contentDraftId: draft.id } })).status, "PUBLISHING");
  await assert.rejects(publishDraft(user.id, draft.id, account.id, async () => { assert.fail("Must not resend"); }), PublishError);
});
test("multi-account drafts retain successes while failed targets are corrected", async () => {
  const { user, account, draft } = await fixture();
  const facebook = await prisma.connectedAccount.create({ data: { userId: user.id, platform: "facebook", platformUserId: "321", accessToken: encrypt("test-token") } });
  await prisma.contentDraftTarget.create({ data: { contentDraftId: draft.id, connectedAccountId: facebook.id } });
  let calls = 0; const x: typeof fetch = async () => { calls++; return Response.json({ data: { id: "606" } }); };
  await publishDraft(user.id, draft.id, account.id, x);
  assert.equal((await prisma.contentDraft.findUniqueOrThrow({ where: { id: draft.id } })).status, "PARTIAL");
  await assert.rejects(publishDraft(user.id, draft.id, facebook.id, async () => new Response(null, { status: 403 })));
  await publishDraft(user.id, draft.id, facebook.id, async () => Response.json({ id: "321_707" }));
  await publishDraft(user.id, draft.id, account.id, x); assert.equal(calls, 1);
  assert.equal((await prisma.contentDraft.findUniqueOrThrow({ where: { id: draft.id } })).status, "PUBLISHED");
});
test("expired X tokens refresh before publishing", async () => {
  const { user, account, draft } = await fixture();
  process.env.X_CLIENT_ID = "test-id"; process.env.X_CLIENT_SECRET = "test-secret";
  await prisma.connectedAccount.update({ where: { id: account.id }, data: { expiresAt: new Date(0), refreshToken: encrypt("test-refresh") } });
  const endpoints: string[] = [];
  await publishDraft(user.id, draft.id, account.id, async (url, init) => {
    endpoints.push(String(url));
    if (String(url).endsWith("/oauth2/token")) return Response.json({ access_token: "refreshed-token", refresh_token: "rotated-refresh", expires_in: 7200 });
    assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer refreshed-token");
    return Response.json({ data: { id: "808" } });
  });
  assert.deepEqual(endpoints, ["https://api.x.com/2/oauth2/token", "https://api.x.com/2/tweets"]);
});

test("paused publishing makes no provider call and leaves a retryable delivery", async () => {
  const { user, account, draft } = await fixture();
  process.env.SIGNAL_PUBLISHING_ENABLED = "false";
  let called = false;
  try {
    await assert.rejects(publishDraft(user.id, draft.id, account.id, async () => {
      called = true;
      throw new Error("Provider must not be called");
    }), /paused/);
    assert.equal(called, false);
    const row = await prisma.contentPublication.findUnique({where:{contentDraftId_connectedAccountId:{contentDraftId:draft.id,connectedAccountId:account.id}}});
    assert.equal(row?.status, "FAILED");
  } finally { delete process.env.SIGNAL_PUBLISHING_ENABLED; }
});

test("saved image survives reopening and publishes once with its receipt", async () => {
  const { normalizeDraftMedia } = await import("./normalize-draft-image.ts");
  const sharp = (await import("sharp")).default;
  const bytes = await sharp({create:{width:10,height:10,channels:3,background:"blue"}}).png().toBuffer();
  const image = await normalizeDraftMedia(`data:image/png;base64,${bytes.toString("base64")}`);
  const { user, account, draft } = await fixture();
  await prisma.contentDraft.update({where:{id:draft.id},data:{mediaUrl:image}});
  const reopened = await prisma.contentDraft.findFirstOrThrow({where:{id:draft.id,userId:user.id}});
  assert.equal(reopened.mediaUrl,image);
  let calls = 0;
  const request: typeof fetch = async (url) => {
    calls++;
    return Response.json({data:{id:String(url).endsWith("/media/upload") ? "701" : "702"}});
  };
  const receipt = await publishDraft(user.id,draft.id,account.id,request);
  assert.equal(receipt.platformPostId,"702");
  assert.equal((await publishDraft(user.id,draft.id,account.id,request)).id,receipt.id);
  assert.equal(calls,2);
  await assert.rejects(publishDraft("other-user",draft.id,account.id,request));
  assert.equal(calls,2);
});

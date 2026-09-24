import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

const { changeSchedule } = await import("./draft-scheduling.ts");
const { runPublishingQueue } = await import("./publishing-worker.ts");
const { validSchedule, publishingBlocker } = await import("./publishing-readiness.ts");
const { updateDraft } = await import("./draft-editing.ts");
process.env.SIGNAL_SCHEDULING_ENABLED="true";
process.env.SIGNAL_SCHEDULER_CONFIGURED="true";
process.env.CRON_SECRET="test-only-secret";
process.env.X_CLIENT_ID="test-client";
process.env.X_CLIENT_SECRET="test-secret";
const now=new Date();
const when=new Date(now.getTime()+120000);
async function queued(platform="x") {
  const f=await fixture(platform);
  await changeSchedule(f.user.id,f.draft.id,f.draft.updatedAt,"schedule",when.toISOString(),now);
  return {...f,draft:await prisma.contentDraft.findUniqueOrThrow({where:{id:f.draft.id}})};
}
test("schedule input requires a future explicit offset and respects 90-day bounds",()=>{
  assert.equal(validSchedule("2027-01-01T12:00",now),null);
  assert.equal(validSchedule(now.toISOString(),now),null);
  assert.equal(validSchedule(new Date(now.getTime()+91*86400000).toISOString(),now),null);
  assert.equal(validSchedule(when.toISOString(),now)?.getTime(),when.getTime());
});
test("ownership, revision and activation must all pass before confirmation",async()=>{
  const f=await fixture();
  await assert.rejects(changeSchedule("other",f.draft.id,f.draft.updatedAt,"schedule",when.toISOString(),now),/not found/);
  await assert.rejects(changeSchedule(f.user.id,f.draft.id,new Date(0),"schedule",when.toISOString(),now),/changed/);
  process.env.SIGNAL_SCHEDULING_ENABLED="false";
  try{await assert.rejects(changeSchedule(f.user.id,f.draft.id,f.draft.updatedAt,"schedule",when.toISOString(),now),/not active/);}finally{process.env.SIGNAL_SCHEDULING_ENABLED="true";}
});
test("reminders are never published; future confirmed posts wait",async()=>{
  const f=await fixture();
  await prisma.contentDraft.update({where:{id:f.draft.id},data:{status:"SCHEDULED",scheduledFor:now}});
  await queued();
  await runPublishingQueue(async()=>{assert.fail("not due");},now);
});
test("cancel wins before claim, stale confirmations fail and queued edits are blocked",async()=>{
  const f=await queued();
  assert.equal(await updateDraft(f.user.id,f.draft.id,{text:"changed",mediaUrl:"",targetIds:[f.account.id],scheduledFor:null,expectedUpdatedAt:f.draft.updatedAt}),"LOCKED");
  await assert.rejects(publishDraft(f.user.id,f.draft.id,f.account.id),/Cancel the schedule/);
  await changeSchedule(f.user.id,f.draft.id,f.draft.updatedAt,"cancel",undefined,now);
  await assert.rejects(changeSchedule(f.user.id,f.draft.id,f.draft.updatedAt,"schedule",when.toISOString(),now),/changed/);
  assert.equal((await prisma.contentDraft.findUniqueOrThrow({where:{id:f.draft.id}})).status,"DRAFT");
});
test("concurrent worker ticks send once and lock cancellation while processing",async()=>{
  // Retire queued fixtures from earlier tests without sending.
  await prisma.contentDraft.updateMany({where:{status:"QUEUED"},data:{status:"DRAFT"}});
  const f=await queued();let calls=0;let release!:()=>void;let entered!:()=>void;
  const started=new Promise<void>(r=>entered=r);const hold=new Promise<void>(r=>release=r);
  const mock:typeof fetch=async()=>{calls++;entered();await hold;return Response.json({data:{id:"101"}});};
  const first=runPublishingQueue(mock,when);await started;
  await runPublishingQueue(mock,when);
  const current=await prisma.contentDraft.findUniqueOrThrow({where:{id:f.draft.id}});
  await assert.rejects(changeSchedule(f.user.id,f.draft.id,current.updatedAt,"cancel",undefined,when),/started/);
  release();await first;
  assert.equal(calls,1);assert.equal((await prisma.contentDraft.findUniqueOrThrow({where:{id:f.draft.id}})).status,"PUBLISHED");
  await runPublishingQueue(mock,when);assert.equal(calls,1);
});
test("unknown delivery needs review; definitive failures allow explicit retry only",async()=>{
  const f=await queued();let calls=0;
  await runPublishingQueue(async()=>{calls++;throw new Error("timeout");},when);
  assert.equal((await prisma.contentDraft.findUniqueOrThrow({where:{id:f.draft.id}})).status,"ATTENTION");
  assert.equal((await prisma.contentPublication.findFirstOrThrow({where:{contentDraftId:f.draft.id}})).status,"UNKNOWN");
  await runPublishingQueue(async()=>{assert.fail("must not retry");},when);
  await assert.rejects(publishDraft(f.user.id,f.draft.id,f.account.id),/unconfirmed/);
  const g=await queued();await runPublishingQueue(async()=>new Response(null,{status:403}),when);
  assert.equal((await prisma.contentPublication.findFirstOrThrow({where:{contentDraftId:g.draft.id}})).status,"PERMISSION_REQUIRED");
  await runPublishingQueue(async()=>{assert.fail("explicit retry required");},when);
  await publishDraft(g.user.id,g.draft.id,g.account.id,async()=>Response.json({data:{id:"202"}}));
  assert.equal((await prisma.contentDraft.findUniqueOrThrow({where:{id:g.draft.id}})).status,"PUBLISHED");
  assert.equal(calls,1);
});
test("missed windows and abandoned processing require attention without posting",async()=>{
  const f=await queued();await prisma.contentDraft.update({where:{id:f.draft.id},data:{scheduledFor:new Date(now.getTime()-3600000)}});
  const g=await queued();await prisma.contentDraft.update({where:{id:g.draft.id},data:{status:"PROCESSING",updatedAt:new Date(now.getTime()-3600000)}});
  await prisma.contentPublication.create({data:{contentDraftId:g.draft.id,connectedAccountId:g.account.id,status:"PUBLISHING"}});
  await runPublishingQueue(async()=>{assert.fail("must not post stale work");},now);
  for(const id of [f.draft.id,g.draft.id])assert.equal((await prisma.contentDraft.findUniqueOrThrow({where:{id}})).status,"ATTENTION");
  assert.equal((await prisma.contentPublication.findFirstOrThrow({where:{contentDraftId:g.draft.id}})).status,"UNKNOWN");
});
test("unsupported media and expired accounts are rejected before queueing",async()=>{
  const f=await fixture("tiktok");await assert.rejects(changeSchedule(f.user.id,f.draft.id,f.draft.updatedAt,"schedule",when.toISOString(),now),/TikTok/);
  assert.match(publishingBlocker({platform:"facebook",platformUserId:"123",expiresAt:null,refreshToken:null},"caption","data:image/jpeg;base64,YWJj")!,/manual/);
  assert.match(publishingBlocker({platform:"x",platformUserId:"123",expiresAt:new Date(0),refreshToken:null},"caption",null)!,/expired/);
});
test("partial delivery retains successes and retry only sends the failed target",async()=>{
  const f=await fixture();await prisma.user.update({where:{id:f.user.id},data:{plan:"PRO"}});
  const fb=await prisma.connectedAccount.create({data:{userId:f.user.id,platform:"facebook",platformUserId:"123",accessToken:encrypt("test")}});
  await prisma.contentDraftTarget.create({data:{contentDraftId:f.draft.id,connectedAccountId:fb.id}});
  await changeSchedule(f.user.id,f.draft.id,f.draft.updatedAt,"schedule",when.toISOString(),now);
  let xCalls=0;
  await runPublishingQueue(async(url)=>{if(String(url).includes("api.x.com")){xCalls++;return Response.json({data:{id:"333"}});}return new Response(null,{status:429});},when);
  assert.equal((await prisma.contentDraft.findUniqueOrThrow({where:{id:f.draft.id}})).status,"ATTENTION");
  await publishDraft(f.user.id,f.draft.id,fb.id,async()=>Response.json({id:"123_444"}));
  assert.equal(xCalls,1);assert.equal((await prisma.contentDraft.findUniqueOrThrow({where:{id:f.draft.id}})).status,"PUBLISHED");
});

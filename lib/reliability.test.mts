import * as serviceConfig from "./service-config.ts";
import { sameConnectionIdentity } from "./connection-identity.ts";
import { readRecovery } from "./draft-recovery.ts";
import * as chatIntent from "./chat-intent.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { withAiPreferences } from "./ai-access.ts";
import { refreshFeedback } from "./refresh-feedback.ts";
import { missingCountFields } from "./metric-measurements.ts";
import { validAiReport } from "./ai-report.ts";
import * as http from "./auth-http.ts";

function load(relative: string, modules: Record<string, unknown>) {
  const source = readFileSync(new URL(relative, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports: Record<string, (...args: any[]) => any> = {};
  runInNewContext(code, { exports, require: (name: string) => {
    if (!(name in modules)) throw new Error(`Unexpected import ${name}`);
    return modules[name];
  }, Response, URL, crypto, console: { error() {} } });
  return exports;
}

for (const path of ["insights/chat", "insights/generate", "insights/post", "reports/generate"]) {
  test(`${path}: disabled preferences prevent both account reads and AI calls`, async () => {
    for (const preferences of [null, { aiInsightsEnabled:false, personalizedRecommendationsEnabled:true }, { aiInsightsEnabled:true, personalizedRecommendationsEnabled:false }]) {
      let accountReads = 0, providerCalls = 0;
      const prisma = { user: { findUnique: async () => preferences }, connectedAccount: { findUnique: async () => { accountReads++; throw new Error("Must not read"); } } };
      const guard = load("./ai-request.ts", { "@/auth": { auth: async () => ({user:{id:"u"}}) }, "@/lib/prisma": { prisma }, "./ai-access.ts": { withAiPreferences }, "./auth-http.ts": http, "./chat-intent.ts": chatIntent, "./service-usage.ts": {reserveUsage:async()=>{},recordUsageFailure:async()=>{},UsageError:class extends Error{}} });
      const route = load(`../app/api/${path}/route.ts`, {
        "@/lib/ai-request": guard, "next/server": { NextResponse: Response }, "@/lib/prisma": { prisma },
        "@/lib/gemini": { gemini: { models: { generateContent: async () => { providerCalls++; } } } },
        "@/lib/chat-intent": chatIntent, "@/lib/ai-report": { validAiReport }, "@/lib/metrics": {}, "@/lib/signal-intelligence": {}, "@/lib/measurement-evidence": {},
      });
      const response = await route.POST(new Request("https://signal.test/api", { method:"POST", body:"{}" }));
      assert.equal(response.status,403);
      assert.equal(response.headers.get("cache-control"),"no-store");
      assert.equal(accountReads,0); assert.equal(providerCalls,0);
    }
  });
}

test("AI request boundary validates origin and size, permits enabled users, redacts failures", async (t) => {
  const previousOrigin = process.env.APP_URL;
  process.env.APP_URL = "https://signal.test";
  t.after(() => { if (previousOrigin === undefined) delete process.env.APP_URL; else process.env.APP_URL = previousOrigin; });
  const guard = load("./ai-request.ts", { "@/auth": { auth: async () => ({user:{id:"u"}}) }, "@/lib/prisma": { prisma:{user:{findUnique:async()=>({aiInsightsEnabled:true,personalizedRecommendationsEnabled:true})}} }, "./ai-access.ts": { withAiPreferences }, "./auth-http.ts": http, "./chat-intent.ts": chatIntent, "./service-usage.ts": {reserveUsage:async()=>{},recordUsageFailure:async()=>{},UsageError:class extends Error{}} });
  const request = (body:string, origin="https://signal.test") => new Request("https://signal.test/api", {method:"POST",headers:{"content-type":"application/json",origin},body});
  let calls=0;
  const run = async () => {calls++;return Response.json({ok:true});};
  assert.equal((await guard.withAiRequest(request("{}"),run)).status,200);
  assert.equal((await guard.withAiRequest(request("{}","https://other.test"),run)).status,403);
  assert.equal((await guard.withAiRequest(request("x".repeat(40_000)),run)).status,413);
  assert.equal((await guard.withAiRequest(request("invalid"),run)).status,400);
  assert.equal(calls,1);
  const failed=await guard.withAiRequest(request("{}"),async()=>{throw new Error("secret-token-private-post");});
  assert.equal(failed.status,503); assert.ok(!(await failed.text()).includes("secret-token"));
});

test("refresh outcomes distinguish cache, active requests, partial results and failure", () => {
  assert.equal(refreshFeedback("AVAILABLE",true).outcome,"cached");
  assert.equal(refreshFeedback("RUNNING",true).outcome,"running");
  assert.equal(refreshFeedback("UNAVAILABLE").outcome,"failed");
  assert.equal(refreshFeedback("PARTIAL").outcome,"partial");
  assert.equal(refreshFeedback("EMPTY").outcome,"empty");
  assert.equal(refreshFeedback("AVAILABLE").outcome,"updated");
  assert.ok(!refreshFeedback("FAILED",true).message.includes("updated"));
});

test("Facebook unsupported views do not mark supported counts incomplete", () => {
  const posts=[{likeCount:3,replyCount:2,retweetCount:1,quoteCount:0,viewCount:null}];
  assert.deepEqual(missingCountFields(posts,"facebook"),[]);
  assert.deepEqual(missingCountFields(posts,"x"),["viewCount"]);
  assert.deepEqual(missingCountFields([{...posts[0],likeCount:null}],"facebook"),["likeCount"]);
});

 test("report validation rejects responses that would break the report view", () => {
  const report={summary:"Summary",wins:["Win"],opportunities:[],actions:[],platformNotes:[]};
  assert.equal(validAiReport(report),true);
  for (const bad of [null, [], { ...report, summary: 3 }, {...report,wins:[null]}, {...report,platformNotes:[{platform:"x"}]}]) assert.equal(validAiReport(bad),false);
});

test("greetings stay conversational but mixed requests still reach analytics", () => {
  for (const content of ["Hi", "Hello!", "hey signal", "Good morning."]) {
    assert.match(chatIntent.conversationalReply([{role:"user",content}])!, /How can I help/);
  }
  for (const content of ["Hi, analyse my account", "hello why are my views down?", "Which post did best?"]) {
    assert.equal(chatIntent.conversationalReply([{role:"user",content}]), null);
  }
  assert.equal(chatIntent.conversationalReply([{role:"assistant",content:"hi"}]),null);
  assert.equal(chatIntent.conversationalReply([null]),null);
});

test("admin access uses an explicit user ID allowlist, not plan or partial matching", () => {
  const env={SIGNAL_ADMIN_USER_IDS:"owner, second",NODE_ENV:"test"} as NodeJS.ProcessEnv;
  assert.equal(serviceConfig.isAdmin("owner",env),true);
  assert.equal(serviceConfig.isAdmin("own",env),false);
  assert.equal(serviceConfig.isAdmin(undefined,env),false);
  assert.equal(serviceConfig.isAdmin("PRO",env),false);
  assert.equal(serviceConfig.enabled("ai",{SIGNAL_AI_ENABLED:"typo",NODE_ENV:"test"} as NodeJS.ProcessEnv),false);
  assert.equal(serviceConfig.limit("BAD",10,{BAD:"oops",NODE_ENV:"test"} as NodeJS.ProcessEnv),0);
});
test("reconnecting a different identity cannot inherit old history", () => {
  assert.equal(sameConnectionIdentity("original","other",true),false);
  assert.equal(sameConnectionIdentity("original","original",true),true);
  assert.equal(sameConnectionIdentity(null,"new",true),false);
  assert.equal(sameConnectionIdentity(null,"new",false),true);
});
test("draft recovery rejects broken, oversized and expired data", () => {
  const draft={text:"draft",mediaUrl:"",scheduledFor:"",targetIds:["a"],savedAt:1000};
  assert.deepEqual(readRecovery(JSON.stringify(draft),2000),draft);
  assert.equal(readRecovery(JSON.stringify(draft),86402000),null);
  assert.equal(readRecovery("invalid"),null);
  assert.equal(readRecovery(JSON.stringify({...draft,text:"a".repeat(65001)}),2000),null);
});

test("usage reservations roll back on any cap and reset by UTC day", async () => {
  // A serial transaction model verifies all-or-nothing reservations across concurrent callers.
  let rows=new Map<string,number>();
  let queue=Promise.resolve();
  const prisma={$transaction: (run:(tx:unknown)=>Promise<unknown>)=>{
    const result=queue.then(async()=>{
      const next=new Map(rows);
      const value=await run({authRateLimit:{upsert:async({where}:{where:{key:string}})=>{
        const count=(next.get(where.key)??0)+1;next.set(where.key,count);return {count};
      }}});
      rows=next;return value;
    });
    queue=result.then(()=>{},()=>{});return result;
  }};
  const config={...serviceConfig,userLimit:()=>2,limit:()=>100};
  const usage=load("./service-usage.ts",{"./prisma.ts":{prisma},"./service-config.ts":config});
  const now=new Date("2026-09-21T23:59:00Z");
  const results=await Promise.allSettled([1,2,3].map(()=>usage.reserveUsage("ai","u","FREE",now)));
  assert.equal(results.filter(r=>r.status==="fulfilled").length,2);
  assert.equal(rows.get("usage:ai:global:2026-09-21"),2);
  await usage.reserveUsage("ai","u","FREE",new Date("2026-09-22T00:01:00Z"));
  assert.equal(rows.get("usage:ai:user:u:2026-09-22"),1);
  const blocked=load("./service-usage.ts",{"./prisma.ts":{prisma},"./service-config.ts":{...config,enabled:()=>false}});
  await assert.rejects(()=>blocked.reserveUsage("ai","u","FREE",now));
  assert.equal(rows.get("usage:ai:global:2026-09-21"),2);
});

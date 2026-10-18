import test from "node:test";
import assert from "node:assert/strict";
import {authorizedCron, runDailyMetrics, utcDayStart} from "./daily-metrics.ts";

test("cron fails closed for missing secrets, forged and malformed authorization", () => {
  const secret = "test-secret-at-least-sixteen-characters";
  assert.equal(authorizedCron(`Bearer ${secret}`, secret), true);
  for (const header of [null, "", secret, "Bearer wrong", `Bearer ${secret}extra`]) assert.equal(authorizedCron(header, secret), false);
  assert.equal(authorizedCron("Bearer undefined", undefined), false);
  assert.equal(authorizedCron("Bearer short", "short"), false);
});
test("UTC daily boundaries remain stable across local offsets", () => {
  assert.equal(utcDayStart(new Date("2026-10-18T00:15:00+01:00")).toISOString(), "2026-10-17T00:00:00.000Z");
});
test("duplicate deliveries do not recollect already claimed accounts", async () => {
  const claimed = new Set<string>(); let reads = 0;
  const dependencies = {claim: async (id: string) => {if (claimed.has(id)) return false; claimed.add(id); return true;}, collect: async () => {reads++; return {ok:true,cached:false};}};
  const accounts = [{id:"a"},{id:"b"}];
  const first = await runDailyMetrics(accounts, dependencies);
  const second = await runDailyMetrics(accounts, dependencies);
  assert.equal(first.collected, 2); assert.equal(second.skipped, 2); assert.equal(reads, 2);
});
test("one failing account does not stop others, and cached data is not a new collection", async () => {
  const result = await runDailyMetrics([{id:"a"},{id:"b"},{id:"c"}], {claim:async()=>true, collect:async id=>{if(id==="a") throw new Error("provider offline"); return {ok:true,cached:id==="b"};}});
  assert.deepEqual(result,{collected:1,failed:1,skipped:1,deferred:0});
});
test("deadline defers work without claiming or charging untouched accounts", async () => {
  const result = await runDailyMetrics([{id:"a"}], {claim:async()=>{throw new Error("must not claim");},collect:async()=>({ok:true,cached:false}),time:()=>100,budgetMs:0});
  assert.equal(result.deferred, 1); assert.equal(result.failed, 0);
});

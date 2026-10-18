import test from "node:test";
import assert from "node:assert/strict";
import { buildRefreshGate } from "./refresh-gate.ts";
import { metricTime } from "./metric-time.ts";
const now = new Date("2026-10-18T20:00:00Z");
const daily = new Date("2026-10-19T00:00:00Z");
const base = {now,enabled:true,analyticsEnabled:true,limits:[]};
test("exhausted allowance takes precedence over a shorter account cooldown",()=>{
 const gate=buildRefreshGate({...base,nextAllowedAt:new Date("2026-10-18T20:15:00Z"),limits:[{count:8,cap:8,resetAt:daily,reason:"Daily allowance used"}]});
 assert.deepEqual(gate,{reason:"Daily allowance used",availableAt:daily.toISOString()});
});
test("monthly reset wins when both daily and monthly limits are exhausted",()=>{
 const monthly=new Date("2026-11-01T00:00:00Z");
 const gate=buildRefreshGate({...base,limits:[{count:8,cap:8,resetAt:daily,reason:"Daily"},{count:2000,cap:2000,resetAt:monthly,reason:"Monthly"}]});
 assert.deepEqual(gate,{reason:"Monthly",availableAt:monthly.toISOString()});
});
test("cooldowns clear at their boundary and unused allowances stay available",()=>{
 assert.equal(buildRefreshGate({...base,nextAllowedAt:now}).reason,null);
 assert.equal(buildRefreshGate({...base,limits:[{count:7,cap:8,resetAt:daily,reason:"Daily"}]}).reason,null);
 assert.equal(buildRefreshGate({...base,nextAllowedAt:new Date(now.getTime()+1000)}).availableAt,"2026-10-18T20:00:01.000Z");
});
test("paused analytics and disabled services have no invented reset time",()=>{
 assert.equal(buildRefreshGate({...base,enabled:false}).availableAt,null);
 assert.match(buildRefreshGate({...base,analyticsEnabled:false}).reason!,/Settings/);
 assert.equal(buildRefreshGate({...base,limits:[{count:0,cap:0,resetAt:daily,reason:"No allowance"}]}).reason,"No allowance");
});
test("metric timestamps explicitly use UTC rather than the host timezone",()=>{
 assert.equal(metricTime("2026-10-18T20:09:37Z"),"18 Oct 2026, 20:09 UTC");
});

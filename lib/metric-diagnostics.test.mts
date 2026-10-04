import test from "node:test";
import assert from "node:assert/strict";
import {platformMetricFailure,tokenRefreshFailure,refreshedToken,metricRefreshError} from "./metric-diagnostics.ts";
import {collectPosts} from "./metrics-collector.ts";

test("provider failures distinguish credits, renewal, permissions, throttling and ambiguous requests",()=>{
 const cases:[string,number,unknown,string,string][]=[
  ["x",402,{},"METRIC_CREDITS","platform"],
  ["x",401,{},"METRIC_RECONNECT","connection"],
  ["x",429,{},"METRIC_RATE_LIMIT","platform"],
  ["facebook",400,{error:{code:190}},"METRIC_RECONNECT","connection"],
  ["facebook",400,{error:{code:613}},"METRIC_RATE_LIMIT","platform"],
  ["facebook",400,{error:{code:100}},"METRIC_REQUEST_REVIEW","unknown"],
  ["facebook",403,{error:{code:200}},"METRIC_PERMISSION","connection"],
  ["tiktok",401,{error:{code:"scope_not_authorized"}},"METRIC_PERMISSION","connection"],
  ["tiktok",200,{error:{code:"access_token_invalid"}},"METRIC_RECONNECT","connection"],
  ["tiktok",500,{error:{code:"internal_error"}},"METRIC_PROVIDER_ERROR","platform"],
 ];
 for(const [platform,status,payload,code,owner] of cases){
  const diagnostic=platformMetricFailure(platform,status,payload);
  assert.equal(diagnostic?.code,code);assert.equal(diagnostic?.responsibility,owner);
 }
 assert.equal(platformMetricFailure("tiktok",200,{error:{code:"ok"}}),null);
 const safe=platformMetricFailure("facebook",400,{error:{code:190,message:"SECRET-TOKEN",fbtrace_id:"PRIVATE"}});
 assert.ok(!JSON.stringify(safe).includes("SECRET-TOKEN"));assert.ok(!JSON.stringify(safe).includes("PRIVATE"));
 assert.equal(platformMetricFailure("tiktok",401,{error:{code:"scope_not_authorized"}})?.stopAccountRequests,false);
});

test("invalid token renewal responses cannot replace a working connection",()=>{
 for(const payload of [{},null,{access_token:""},{access_token:"dummy",expires_in:"3600"},{access_token:"dummy",expires_in:-1},{access_token:"dummy",expires_in:Infinity},{access_token:"dummy",expires_in:3600,refresh_token:0}]) assert.throws(()=>refreshedToken("tiktok",payload));
 const parsed=refreshedToken("tiktok",{access_token:"dummy",expires_in:3600},0);
 assert.equal(parsed.expiresAt.getTime(),3600000);assert.equal(parsed.refreshToken,undefined);
 assert.equal(tokenRefreshFailure("x",400,{error:"invalid_grant"})?.responsibility,"connection");
 assert.equal(tokenRefreshFailure("x",401,{error:"invalid_client"})?.responsibility,"signal");
});

test("Meta invalid tokens and TikTok application errors stop after one post request",async()=>{
 for(const [platform,status,payload] of [["facebook",400,{error:{code:190}}],["tiktok",200,{error:{code:"rate_limit_exceeded"}}],["x",402,{detail:"SECRET"}]] as const){
  let calls=0;
  const fetcher=(async()=>{calls++;return Response.json(payload,{status});}) as typeof fetch;
  const result=await collectPosts(platform,"owner","dummy",10,fetcher);
  assert.equal(calls,1);assert.equal(result.complete,false);assert.equal(result.posts.length,0);
  assert.ok(!result.warning?.includes("SECRET"));
 }
});

test("metric errors keep meaningful server guidance instead of turning daily budgets into cooldowns",()=>{
 assert.equal(metricRefreshError({error:"Daily collection budget reached."}),"Daily collection budget reached.");
 assert.match(metricRefreshError({error:{detail:"unsafe shape"}}),/saved data/);
});

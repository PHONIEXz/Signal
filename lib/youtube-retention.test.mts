import test from "node:test";
import assert from "node:assert/strict";
import { validateRetention, youtubeRetention, RETENTION_COLUMNS } from "./youtube-retention.ts";
const payload=(rows:unknown[][]=[])=>({columnHeaders:RETENTION_COLUMNS.map(name=>({name})),rows});
const videos=Array.from({length:5},(_,i)=>({id:`video00000${i}`,text:`Video ${i}`,url:`https://www.youtube.com/watch?v=video00000${i}`}));

test("retention preserves decimals, actual zeros and replay ratios above one",()=>{
 assert.deepEqual(validateRetention(payload([[0.01,1.25,0.8],[0.5,0.5,0.4],[1,0,0]])),[{progress:0.01,watchRatio:1.25,relativePerformance:0.8},{progress:0.5,watchRatio:0.5,relativePerformance:0.4},{progress:1,watchRatio:0,relativePerformance:0}]);
 assert.deepEqual(validateRetention(payload()),[]);
 assert.deepEqual(validateRetention({columnHeaders:RETENTION_COLUMNS.map(name=>({name}))}),[]);
});
test("retention rejects malformed, unordered and out-of-domain values",()=>{
 for(const rows of [[[0.5,1,0.5],[0.5,0.4,0.4]],[[0.8,1,0.5],[0.2,1,0.5]],[[1.1,1,0.5]],[[0.1,1,1.1]],[[0.1,-1,0.5]],[[0.1,NaN,0.5]],[[0.1,"1",0.5]],[[0.1,null,0.5]],[[0.1,1]]])assert.throws(()=>validateRetention(payload(rows)));
 assert.throws(()=>validateRetention({columnHeaders:[{name:"wrong"}],rows:[]}));
});
test("retention reads at most three unique verified videos with matching reporting dates",async()=>{
 const seen:URL[]=[];const request=(async(input:unknown)=>{seen.push(new URL(String(input)));return Response.json(payload([[0.5,0.75,0.5]]));}) as typeof fetch;
 const result=await youtubeRetention("owner-channel","test",{startDate:"2026-09-01",endDate:"2026-09-28"},[videos[0],videos[0],...videos.slice(1)],request);
 assert.equal(result.length,3);assert.equal(seen.length,3);
 for(let i=0;i<3;i++){assert.equal(seen[i].searchParams.get("ids"),"channel==owner-channel");assert.equal(seen[i].searchParams.get("filters"),`video==${videos[i].id}`);assert.equal(seen[i].searchParams.get("startDate"),"2026-09-01");assert.equal(seen[i].searchParams.get("endDate"),"2026-09-28");assert.equal(seen[i].searchParams.get("dimensions"),"elapsedVideoTimeRatio");}
});
test("an unavailable video report leaves other curves available and empty rows remain empty",async()=>{
 let calls=0;const request=(async()=>{calls++;return calls===2?Response.json({error:{}},{status:500}):Response.json(payload(calls===3?[]:[[0.5,1.2,0.5]]));}) as typeof fetch;
 const result=await youtubeRetention("channel","test",{startDate:"2026-09-01",endDate:"2026-09-28"},videos,request);
 assert.equal(result[0].points![0].watchRatio,1.2);assert.equal(result[1].points,null);assert.ok(result[1].warning);assert.deepEqual(result[2].points,[]);
});
test("quota failures stop retention requests without leaking upstream messages",async()=>{
 let calls=0;const request=(async()=>{calls++;return Response.json({error:{errors:[{reason:"quotaExceeded"}],message:"PRIVATE_TOKEN"}},{status:403});}) as typeof fetch;
 const result=await youtubeRetention("channel","test",{startDate:"2026-09-01",endDate:"2026-09-28"},videos,request);
 assert.equal(calls,1);assert.equal(result[0].points,null);assert.match(result[0].warning!,/quota/);assert.ok(!result[0].warning!.includes("PRIVATE_TOKEN"));
});

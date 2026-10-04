import test from "node:test";
import assert from "node:assert/strict";
import {creatorConfigured,creatorJson,creatorProfile,creatorPosts,decimalCount} from "./creator-platforms.ts";
import {reportPeriod,validateReport,youtubeReports,YOUTUBE_REPORTS} from "./youtube-reports.ts";
import {missingCountFields} from "./metric-measurements.ts";
const response=(body:unknown,status=200)=>Response.json(body,{status});
const request=(handler:(url:URL)=>Response)=>((input:unknown)=>Promise.resolve(handler(new URL(String(input))))) as typeof fetch;

test("provider readiness requires explicit, server-only configuration",()=>{
 assert.equal(creatorConfigured("instagram",{}),false);assert.equal(creatorConfigured("youtube",{}),false);
 assert.equal(creatorConfigured("instagram",{FACEBOOK_APP_ID:"test",FACEBOOK_APP_SECRET:"test",INSTAGRAM_FACEBOOK_CONFIG_ID:"test"}),true);
 assert.equal(creatorConfigured("youtube",{YOUTUBE_CLIENT_ID:"test",YOUTUBE_CLIENT_SECRET:"test"}),true);
});
test("YouTube decimal counters retain billions without accepting unsafe or malformed counts",()=>{
 assert.equal(decimalCount("5000000000"),5000000000);assert.equal(decimalCount("0"),0);
 for(const value of ["-1","1.5",null,"9007199254740993",-1,NaN,1.5])assert.equal(decimalCount(value),null);
});
test("quota, authorization and malformed errors are classified without leaking messages",async()=>{
 await assert.rejects(creatorJson("https://example.test","test",request(()=>response({error:{errors:[{reason:"quotaExceeded"}],message:"PRIVATE_TOKEN"}},403))),/quota/);
 try{await creatorJson("https://example.test","test",request(()=>response({error:{errors:{},message:"PRIVATE_TOKEN"}},403)));assert.fail();}catch(error){assert.ok(!String(error).includes("PRIVATE_TOKEN"));assert.match(String(error),/denied access/);}
});
test("Instagram preserves unavailable Insights fields and stores real zero likes",async()=>{
 const result=await creatorPosts("instagram","ig","test",10,null,request(()=>response({data:[{id:"1",caption:"Post",like_count:0,comments_count:2,timestamp:"2026-10-01T12:00:00Z",permalink:"https://www.instagram.com/p/test/"}]})));
 assert.equal(result.complete,true);assert.equal(result.posts[0].likeCount,0);assert.equal(result.posts[0].viewCount,null);assert.equal(result.posts[0].retweetCount,null);assert.deepEqual(missingCountFields(result.posts,"instagram"),[]);
});
test("YouTube requires matching identity and preserves hidden subscribers",async()=>{
 await assert.rejects(creatorProfile("youtube","wanted","test",request(()=>response({items:[{id:"other"}]}))),/channel/);
 const profile=await creatorProfile("youtube","wanted","test",request(()=>response({items:[{id:"wanted",statistics:{hiddenSubscriberCount:true,subscriberCount:"0",videoCount:"0"}}]})));
 assert.equal(profile.followers,null);assert.equal(profile.totalPosts,0);
});
test("YouTube reads the upload playlist and excludes private media",async()=>{
 const seen:URL[]=[];
 const result=await creatorPosts("youtube","channel","test",10,"uploads",request(url=>{seen.push(url);if(url.pathname.endsWith("playlistItems"))return response({items:[{contentDetails:{videoId:"public"}},{contentDetails:{videoId:"private"}}]});return response({items:[{id:"public",snippet:{title:"Video",channelId:"channel"},status:{privacyStatus:"public"},statistics:{viewCount:"5000000000",likeCount:"0"}},{id:"private",snippet:{channelId:"channel"},status:{privacyStatus:"private"}}]});}));
 assert.equal(result.posts.length,1);assert.equal(result.posts[0].viewCount,5000000000);assert.equal(result.posts[0].replyCount,null);assert.equal(result.requests,2);assert.equal(seen[0].searchParams.get("playlistId"),"uploads");assert.ok(seen.every(url=>!url.pathname.endsWith("search")));
});
test("repeated pagination preserves the partial sample and stops bounded reads",async()=>{
 const result=await creatorPosts("instagram","ig","test",10,null,request(()=>response({data:[{id:"1"}],paging:{next:"opaque",cursors:{after:"repeat"}}})));
 assert.equal(result.complete,false);assert.equal(result.posts.length,1);assert.equal(result.requests,2);assert.match(result.warning!,/pagination/);
});
test("YouTube periods use Pacific reporting days, inclusive dates and processing lag",()=>{
 assert.deepEqual(reportPeriod(7,new Date("2026-10-04T01:00:00Z")),{startDate:"2026-09-24",endDate:"2026-09-30",timeZone:"America/Los_Angeles"});
});
test("report validation retains decimal durations and distinguishes empty from zero",()=>{
 const columns=["views","averageViewDuration"];
 assert.deepEqual(validateReport({columnHeaders:columns.map(name=>({name})),rows:[[0,15.75]]},columns).rows,[[0,15.75]]);
 assert.deepEqual(validateReport({columnHeaders:columns.map(name=>({name}))},columns).rows,[]);
 assert.throws(()=>validateReport({columnHeaders:[{name:"unexpected"}],rows:[[1]]},columns));
 assert.throws(()=>validateReport({columnHeaders:columns.map(name=>({name})),rows:[[NaN,2]]},columns));
});
test("one unavailable report does not erase others, and quota failure stops further reads",async()=>{
 let calls=0;
 const reports=await youtubeReports("channel","test",28,request(url=>{calls++;if(url.searchParams.get("dimensions")==="country")return response({error:{}},500);const definition=Object.values(YOUTUBE_REPORTS).find(report=>report.dimensions===(url.searchParams.get("dimensions")??""))!;const columns=[...definition.dimensions?definition.dimensions.split(","):[],...definition.metrics.split(",")];return response({columnHeaders:columns.map(name=>({name})),rows:[]});}));
 assert.equal(calls,6);assert.ok(reports.reports.overview);assert.equal(reports.reports.countries,undefined);assert.equal(reports.warnings.length,1);
 calls=0;await youtubeReports("channel","test",28,request(()=>{calls++;return response({error:{errors:[{reason:"quotaExceeded"}]}},403);}));assert.equal(calls,1);
});

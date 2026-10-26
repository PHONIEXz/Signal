import test from 'node:test';
import assert from 'node:assert/strict';
import {rankContent,contentWindow,performanceMetric} from './content-performance.ts';
const p=(id:string,n:number|null)=>({id,text:id,postedAt:new Date('2026-10-24'),fetchedAt:new Date('2026-10-25'),likeCount:n,viewCount:n,replyCount:n});
test('ranked evidence excludes unknowns, preserves zero and reports ties',()=>{
 const r=rankContent([p('a',null),p('b',0),p('c',9),p('d',9)],'likes','x','PARTIAL');
 assert.equal(r.measured,3);assert.equal(r.tied,2);assert.equal(r.leaders[0].value,9);assert.equal(r.leaders[2].value,0);
});
test('unsupported and unverified metrics never rank stored counts',()=>{
 for(const status of ['CONTENT_ONLY','UNAVAILABLE','LEGACY','EMPTY'])assert.equal(rankContent([p('a',90)],'likes','x',status).measured,0);
 assert.equal(rankContent([p('a',90)],'views','facebook','AVAILABLE').supported,false);
 assert.equal(performanceMetric('arbitrary'),'likes');
});
test('audience overlap uses actual in-window timestamps and ignores undated posts',()=>{
 const rows=[{fetchedAt:new Date('2026-10-20'),followersCount:20},{fetchedAt:new Date('2026-10-25'),followersCount:23},{fetchedAt:new Date('2026-10-28'),followersCount:99}];
 const r=contentWindow([p('a',1),{...p('b',2),postedAt:null}],rows,new Date('2026-10-26'))!;
 assert.equal(r.delta,3);assert.equal(r.posts.length,1);
 assert.equal(contentWindow([],rows.slice(0,1),new Date('2026-10-26')),null);
});

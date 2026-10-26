import test from 'node:test';
import assert from 'node:assert/strict';
import {channelComparison} from './channel-comparison.ts';
const point=(date:string,followers:number|null)=>({date,followers,likes:null,views:null,posts:null});
const end='2026-10-25T12:00:00Z';
test('window excludes future and old data and sorts observations',()=>{
 const r=channelComparison([point('2026-10-25T11:00:00Z',110),point('2026-10-20T11:00:00Z',100),point('2026-10-01',1),point('2026-10-26',900)],7,end);
 assert.equal(r.delta,10);assert.equal(r.percent,10);assert.equal(r.count,2);assert.equal(r.stale,false);
});
test('unknown endpoints, single observation and same-time data cannot imply growth',()=>{
 for(const rows of [[],[point(end,2)],[point(end,2),point(end,3)],[point('2026-10-20',3),point(end,null)]])assert.equal(channelComparison(rows,7,end).delta,null);
});
test('zero baseline keeps absolute growth but no percentage; old values are flagged',()=>{
 const r=channelComparison([point('2026-10-20',0),point('2026-10-23',5)],7,end);assert.equal(r.delta,5);assert.equal(r.percent,null);assert.equal(r.stale,true);
 assert.equal(channelComparison([point('2026-10-20',10),point(end,8)],7,end).percent,-20);
});

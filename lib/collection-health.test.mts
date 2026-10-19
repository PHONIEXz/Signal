import test from "node:test";
import assert from "node:assert/strict";
import { accountCoverage, collectionWindow, runStatus, scheduleHealth } from "./collection-health.ts";
import type { DailyRun } from "./daily-run-store.ts";
const run = (overrides: Partial<DailyRun> = {}): DailyRun => ({id:"r",day:"2026-10-19",trigger:"scheduler",startedAt:"2026-10-19T06:05:00Z",finishedAt:"2026-10-19T06:06:00Z",status:"COMPLETE",eligible:3,collected:2,skipped:0,failed:1,deferred:0,moreAccounts:0,...overrides});
test("schedule waits through the Hobby window and grace, then flags absence", () => {
  assert.equal(scheduleHealth([],new Date("2026-10-19T05:59:59Z")).state,"NOT_DUE");
  assert.equal(scheduleHealth([],new Date("2026-10-19T06:59:59Z")).state,"WAITING");
  assert.equal(scheduleHealth([],new Date("2026-10-19T07:14:59Z")).state,"WAITING");
  assert.equal(scheduleHealth([],new Date("2026-10-19T07:15:00Z")).state,"MISSING");
  assert.equal(collectionWindow(new Date("2026-10-19T00:30:00+01:00")).day,"2026-10-18");
});
test("manual invocations cannot prove a scheduled run; unfinished runs become interrupted", () => {
  const now = new Date("2026-10-19T08:00:00Z");
  assert.equal(scheduleHealth([run({trigger:"authorized"})],now).state,"MISSING");
  assert.equal(scheduleHealth([run({status:"INCOMPLETE"})],now).state,"INCOMPLETE");
  assert.equal(runStatus(run({status:"RUNNING",finishedAt:null}),new Date("2026-10-19T06:10:00Z")),"RUNNING");
  assert.equal(runStatus(run({status:"RUNNING",finishedAt:null}),now),"INTERRUPTED");
  assert.equal(scheduleHealth([run({day:"2026-10-18"})],now).state,"MISSING");
});
test("coverage counts recorded days once and excludes pre-connection windows", () => {
  const now = new Date("2026-10-19T08:00:00Z");
  const dates = [new Date("2026-10-18T06:05:00Z"),new Date("2026-10-18T20:00:00Z")];
  const coverage = accountCoverage(dates,new Date("2026-10-17T07:00:00Z"),true,now);
  assert.equal(coverage.state,"MISSING");
  assert.equal(coverage.recorded,1);
  assert.deepEqual(coverage.completed,[{day:"2026-10-18",recorded:true},{day:"2026-10-19",recorded:false}]);
  assert.equal(accountCoverage(dates,new Date("2026-10-01"),false,now).state,"PAUSED");
  assert.equal(accountCoverage([...dates,now],new Date("2026-10-01"),true,now).state,"RECORDED");
  assert.equal(accountCoverage(dates,new Date("2026-10-01"),true,new Date("2026-10-19T06:30:00Z")).state,"WAITING");
});

# Daily metric history

Manual refreshes already append MetricSnapshot records and per-post PostMeasurement records. They do not overwrite past snapshots. Previously there was no scheduler, so inactive days had no observations. Account history also incorrectly depended on the selected post sample size.

The daily job calls the same collector as manual refresh, including token refresh, analytics opt-out, provider diagnostics, leases, cooldowns and all existing per-user/global API allowances. It collects a consistent 10-post sample. Likes/views are cumulative totals for that sample, not account-wide lifetime totals or newly earned daily interactions. Facebook account post totals and unavailable fields remain unavailable.

Follower/post history uses all account snapshots, independent of post sample selection. Sample likes/views still use only the selected sample size. Daily/weekly/monthly/yearly points use the last saved counter in each UTC period, never sums of cumulative counters. Counts can genuinely remain flat; missing dates are gaps. Hourly views require multiple observations during a day; the scheduler itself is daily.

## Activation

Set a randomly generated server-only CRON_SECRET (at least 16 characters) on the signal-phoenix-dashboard production project, then deploy this branch to production. The endpoint rejects missing/invalid secrets and refuses Vercel preview environments. Vercel injects the matching Authorization header.

vercel.json schedules 06:00 UTC daily (07:00 Lagos). Hobby execution may occur anywhere in that hour. Cron only runs on production, not previews. No database migration is needed.

## Reliability and scope

Successful 10-post snapshots from today skip a duplicate scheduled collection. A durable per-account/day claim prevents duplicated cron deliveries from charging provider usage twice, including failed attempts. Manual refresh remains available for retry after normal cooldowns. Failed/disabled/limited accounts never receive fake snapshots. Actual per-post measurements can still be saved when a profile counter is unavailable; no follower value is invented to force an account snapshot.

The current bounded job processes at most 100 accounts with three workers and stops starting work after 150 seconds. Aggregate failure/deferred counts return HTTP 503 for monitoring. Vercel does not automatically retry failures. Larger installations require a durable queue; this job does not guarantee every account can be collected within provider quotas or its execution budget. Stale attempts are processed first. Daily claims use the existing AuthRateLimit store and expiry cleanup.

Historical gaps cannot be filled from today's counters. Platform-supported historical imports need their own validation and timestamps. Do not copy today's values backwards or invent movement.

## Verification

Unit tests cover authorization, UTC boundaries, duplicate delivery, independent failures, cached outcomes and execution deadlines. The HTTP smoke test exercises the protected route with isolated provider fixtures and verifies persisted follower/post/like/view history across two dates plus no duplicate snapshot on retry. No live provider credits are consumed by tests.

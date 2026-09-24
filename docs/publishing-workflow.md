# Publishing workflow release (preview review required)

## User flow

Open Queue & updates in the dashboard header or Publishing queue in Content Studio. Save content first, inspect the image in Studio, then confirm the exact saved text, targets, local time and timezone. Saving a planned date in Studio still creates a reminder only. Explicit confirmation is required to create QUEUED work. UTC instants are stored; the browser displays its IANA timezone. Nonexistent daylight-saving times are rejected; repeated local times select the earlier occurrence and the confirmation shows the resolved instant. The queue shows the most recently updated 100 drafts and refreshes every 15 seconds while visible.

Cancel a queued schedule before editing, deleting or publishing manually. Rescheduling rechecks the revision and account readiness. Once processing starts, cancellation and editing are rejected atomically. X text/images and Facebook text/links are supported; TikTok and Facebook images remain manual.

Delivery updates appear in Notifications. Read markers are browser-local, per user, not synchronized between devices; no email, push or third-party message is sent. Failed targets can be explicitly retried. Successes retain their receipts. Unconfirmed results require checking the platform and cannot be retried automatically.

## State and worker behavior

Existing SCHEDULED values are reminders and NEVER eligible for delivery. New QUEUED values require explicit confirmation. The worker atomically claims a draft as PROCESSING, then relies on per-account publication claims to prevent duplicate sending. Duplicate worker invocations cannot claim the same draft. Editing, deletion, manual publishing, cancel and reschedule respect this claim. QUEUED posts more than 15 minutes late become ATTENTION instead of posting unexpectedly. PROCESSING older than 15 minutes becomes ATTENTION; PUBLISHING receipts become UNKNOWN. No automatic retries occur after a definitive or ambiguous failure. Explicit retries retain prior successful targets.

Each tick processes at most two drafts, with their supported accounts in parallel, using existing per-user and shared publishing allowances. Worker route maxDuration is 120 seconds. Monitor backlog and capacity before scaling. A provider might accept a request before a network failure; exactly-once external delivery cannot be guaranteed without provider idempotency. The system prefers manual investigation to duplicate posting.

No schema migration: existing draft status/date, updatedAt and publication records are used. Updating the app is required on all writers; rolling back to code that does not recognize QUEUED/PROCESSING is unsafe until scheduling is disabled, in-flight work is resolved and queued work is cancelled.

## Activation remains OFF

Nothing in this branch installs a live cron schedule, funds a provider or posts a real message. After preview testing and explicit release approval:

1. Configure a separate preview database and credentials for tests. Keep SIGNAL_SCHEDULING_ENABLED=false in production until activation is approved.
2. Configure a scheduler to call GET /api/cron/publishing every minute with Authorization: Bearer CRON_SECRET. Use a long random server-only CRON_SECRET. Do not expose it in NEXT_PUBLIC_ variables or a query string.
3. Vercel native cron uses production deployments. Check the current hosting plan's frequency limits; once-daily execution is unsuitable for minute-based publishing. A compatible external scheduler can call the same authenticated endpoint. Choose and approve the service before enabling it.
4. For native Vercel cron, add {"crons":[{"path":"/api/cron/publishing","schedule":"* * * * *"}]} to vercel.json only after the intended hosting plan supports it. No vercel.json change is included in this release.
5. Set SIGNAL_SCHEDULER_CONFIGURED=true after verifying ticks; then SIGNAL_SCHEDULING_ENABLED=true. These are configuration declarations, not a live heartbeat monitor. Both flags, CRON_SECRET and the publishing switch must permit work. Redeploy environment changes.
6. Run a user-approved real post test for each supported platform before inviting users. X images require media.write after reconnect. Existing tokens/scopes, credits, app approval and platform errors are verified on delivery, not inferred from credential presence.

Turning either scheduling flag off prevents new claims/sends from starting; in-flight provider calls may complete. Leave the worker callable for operations monitoring. The endpoint returns paused:true when disabled. Recovery sweeps run when scheduling is enabled again. Posts outside the delivery window then need review.

## Test checklist

- Confirm a schedule, refresh, inspect UTC/local display, cancel and reschedule.
- Verify unconfirmed old reminders never post.
- Race cancellation/editing/manual publish with worker claims and duplicate ticks.
- Verify ownership, CSRF, explicit confirmation, revision conflicts and unauthorized cron calls.
- Test missing setup, expired tokens, plan downgrade, quota pause, provider rejection, upload failure and network ambiguity.
- Confirm successful receipts survive a failed second target and only that target is retried.
- Verify missed and interrupted jobs need review rather than silently re-sending.
- Confirm queue responses expose no tokens, and browser-local notification read state works.

CI uses disposable SQLite databases and mocked provider calls, plus authenticated HTTP tests against the production build. No real social posts are sent by tests. Browser/device acceptance and live provider testing remain part of user review before merge.

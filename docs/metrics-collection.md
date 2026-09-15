# Metrics collection and measurement history

Signal distinguishes a measured `0` from an unavailable `null`. A missing field, denied permission, malformed counter or unavailable API response is not a zero. Totals are unavailable if any required count is missing; cross-platform totals identify partial coverage. Engagement rates use views and interactions from the same eligible post samples.

## What the app collects

| Platform | Post measurements | Limits and meaning |
| --- | --- | --- |
| X | Public likes, replies, reposts, quotes and impressions when returned | Cursor pagination; API credits and permissions still apply. |
| Facebook | Page post text, reactions, comments and shares when returned | Reactions include more than likes. Missing shares stay unknown. Restricted engagement fields can fall back to basic content. |
| TikTok | Public video likes, comments, shares and views when returned | Cursor pagination, up to 20 videos per request; approved scopes and account authorization apply. |
| Facebook Page Insights | Numeric daily `page_media_view` values, fetched separately for the last seven days | Requires supported Page Insights access. Page media views include Page content and ads; they are not assigned to individual posts or added to post impressions. Unsupported insights do not block post collection. |

The collector follows provider cursors on fixed API hosts, deduplicates IDs, stops at the selected sample or ten post requests, and uses ten-second request timeouts. A later failed page preserves earlier results as partial. A valid empty response is distinct from a failure. Platform error bodies and access tokens are not shown to users.

Collection remains user-triggered. This change does not introduce a scheduled worker or unlimited historic backfill. Selecting a publication-date range filters stored posts; their counts are cumulative at measurement time, not interactions received during that date range.

## History, status and caching

Each successful write records the source (`API` or `CSV`), measurement time, nullable fields and collection sample ID. The post keeps its newest measurements. Importing an older measurement adds history without replacing newer counters or content. Tags remain intact. The post screen shows the latest 20 history points and compares each point with an earlier point for the same post and source; it does not compare API counts with CSV counts. Negative corrections are retained rather than described as guaranteed growth.

Account snapshots retain sampled totals, but a changing recent-post sample is not a valid same-post growth comparison. Sample likes/reactions and views can be plotted as observations; their automatic momentum/difference calculations are disabled. Follower and account-post comparisons remain separate.

The account and platform-post screens show the last successful collection, last attempt, last stored source/sample, missing fields, warnings and next allowed time. Failed requests retain cached posts and the prior successful timestamp. CSV measurements are user-supplied and are labelled accordingly in the UI and AI evidence. CSV imports do not alter live account totals or create follower snapshots.

A transaction claims a five-minute lease before platform requests. The same account has a 15-minute refresh/import cooldown; concurrent requests reuse cached status. An expired lease cannot commit. Across all connected platforms, daily UTC collection/import attempts are capped at 12 for Free and 48 for Pro. These caps reduce duplicate work; they are not a dollar spending guarantee. Failed attempts also consume a slot. Billing/token/rate-limit failures on the account request do not trigger a second post request. No retry loop bypasses an API billing error.

## CSV workflow

On **Posts → platform**, expand **Import measurements from CSV**, download the template, choose a file and specify when its counts were measured. Preview the parsed rows, missing fields and source disclaimer before confirming. Only the signed-in user's connected account can receive the import. Analytics collection must be enabled.

Files must be at most 512 KB, with 1–10 posts for Free or 1–100 for Pro. Quoted commas/newlines and escaped quotes are supported. Counts must be nonnegative whole numbers; leave unknown counts blank. Use the actual numeric platform post ID, or Facebook `PageID_PostID`. Column aliases include `post_id`, `tweet_id` and `video_id`. Adapt native export column headings to the supplied templates. Not every platform supplies an export for every account or plan; the app does not promise export access.

Facebook imports use the `reactions` column rather than interpreting `likes` as all reactions. Facebook post `views` are ignored because their meaning cannot safely be inferred from a generic CSV column. Page Insights remain a separate API dataset. No API requests are made by previewing or importing a CSV.

## Existing database upgrade — before merging/deploying

Use a separate preview database to review the change. Do not give the review deployment production database credentials until the reviewed upgrade is complete.

1. Export a backup of the existing Turso database. Stop local app processes and pause all application collection/writes while upgrading. Coordinate the new deployment immediately after the upgrade so an older app version cannot write default-zero counters again.
2. In the project checkout, get this branch and install dependencies:

   ```sh
   git fetch origin
   git switch feat/metrics-history
   git pull --ff-only origin feat/metrics-history
   npm ci
   ```

3. Keep the existing Turso credentials and encryption key. If the destination still has the old eleven-table schema, first run `npm run db:turso:upgrade-publishing`. A database already upgraded for drafts/publishing has twelve application tables. Then run:

   ```sh
   npm run db:turso:upgrade-metrics -- --app-stopped
   npm run db:turso:check
   ```

4. The metrics upgrade verifies the prior baseline, runs in one transaction, verifies foreign keys/columns/indexes, and updates the setup marker. It adds three tables and rebuilds `Post` with nullable counters. A fresh/upgraded database has **15 application tables**. Repeating the command preserves new measurements; unknown baselines or unexpected relationships stop the upgrade.
5. Existing post counters are copied into `PostMeasurement.rawLegacy` with source `LEGACY`, then cleared from current post counters. Old account snapshots are marked `LEGACY`; their post totals are hidden from metric displays. This is deliberate: the old implementation did not distinguish missing fields from real zeros. Post text, tags, IDs, URLs, dates, drafts, accounts and encrypted tokens are preserved. Fresh API collection or labelled CSV import establishes new usable post evidence. Follower history remains available.
6. For a local SQLite database, use `npx prisma migrate deploy` with `DATABASE_PROVIDER=sqlite` after backing it up. Do not point Prisma migration commands at the remote libSQL URL. Schema rollback requires the exported backup and matching older application version; do not reset or delete the hosted database.

The upgrade command uses the supplied `--app-stopped` acknowledgement; it cannot stop Vercel traffic itself. No new secret or paid provider is required for storage/import. Existing API costs, approvals, credits and permissions still determine live retrieval.

## Checks performed

`npm run test:metrics-history` exercises pagination, missing-versus-zero counts, errors/partial pages, basic Facebook fallback, isolated insights, CSV validation, migration preservation/rollback/idempotence, lease/cooldown limits and older-history imports. Existing metrics, AI and Turso tests check calculations, evidence grounding and baseline compatibility. `npm run test:auth:http` uses an isolated local database and the production build to test authenticated preview/import, ownership, disabled analytics, cached refreshes, visible history and schema errors without live API calls or email.

## Reference behavior

- [X timeline pagination](https://docs.x.com/x-api/posts/timelines/integrate)
- [X API pricing and owned reads](https://docs.x.com/x-api/getting-started/pricing): lower owned-read rates apply only where the authenticated user also owns the developer app; they do not cover every Signal customer.
- [Meta Insights reference](https://developers.facebook.com/docs/graph-api/reference/insights/)
- [TikTok video list](https://developers.tiktok.com/doc/tiktok-api-v2-video-list)
- [Buffer Analyze](https://support.buffer.com/en-us/articles/using-buffer-analyze-nHvyBMdqz8): provider-fed measurements and collection windows, rather than a general free API workaround.

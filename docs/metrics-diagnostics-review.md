# Signal metric audit, 4 October 2026

## Finding

A missing counter alone does not prove a platform outage. Provider access, application configuration, Signal budgets, incomplete samples, and stale rendering can each cause different results. A real zero must remain distinguishable from unavailable data.

## Architecture and fixes

Refresh is authenticated and owner scoped, then claims an account lease, reserves shared usage, renews authorization if necessary, requests account counters and post samples, stores measurements in a transaction, and refreshes the displayed cards.

- Classify provider status and allowlisted error codes. Never show raw upstream messages, trace identifiers, or tokens.
- Stop further account requests for billing, invalid-token, throttling, and provider outage errors. Preserve previous data.
- TikTok scope errors can arrive as HTTP 401. Check their error code before assuming an expired token. Missing profile statistics must not prevent independently permitted video collection.
- Preserve the successful data source after a failed collection. A failed API request must not relabel CSV evidence as API evidence.
- Show current selected post measurements independently of follower snapshots. Fresh posts and CSV imports previously could leave account cards stale when follower counters were missing.
- Validate refreshed X and TikTok tokens and expiry before saving them. Bound TikTok renewal with a 20-second timeout and check server application configuration before requesting renewal.
- Keep collection warnings visible on partial and cached responses. Show collection status, previous successful source, and next permitted refresh as three short cards.
- Preserve the actual Signal usage allowance reset in saved sync status. It must not become a generic server error or 15-minute retry suggestion.
- Externalize the SQLite Prisma adapter so the production bundle resolves its native binding from the package directory. Direct database tests alone missed this packaging failure.

## Diagnosis matrix

| Evidence | Likely boundary | Remedy |
| --- | --- | --- |
| X HTTP 402 | Provider billing or credit access | Check Developer Console balance and spending cap. Reconnection does not restore credits. |
| Invalid authorization or Meta code 190 | Connection | Reconnect the intended account. |
| TikTok scope error | Approved scopes and account consent | Check app approval and required user.info.stats/video.list access. |
| Permission denial | Account/app access | Inspect approved permissions and the selected Page/account. |
| Meta code 100 or invalid parameters | Request/access ambiguity | Review fields, API version and object access before blaming permissions. |
| Provider throttling or 5xx | Provider capacity | Keep saved data and retry after the restriction clears. |
| Signal allowance response | Signal budget | Respect its explicit reset time. |
| Invalid application credentials or database failure | Signal configuration/runtime | Review server configuration/runtime. |

Sources checked: [X pricing and credits](https://docs.x.com/x-api/getting-started/pricing), [TikTok errors](https://developers.tiktok.com/docs/en/tiktok-api-v2-error-handling), and [TikTok scopes](https://developers.tiktok.com/doc/tiktok-api-scopes). Meta's official documentation could not be retrieved during this audit; Meta diagnostic handling was tested against controlled responses, not a live account.

## Verification and limits

Regression tests use isolated databases. The production HTTP test uses encrypted dummy connections and explicitly enabled provider fixtures; it verifies credits, missing follower counters, TikTok profile scope denial with successful video collection, Meta invalid tokens, cached warnings, successful source preservation, allowance resets, and rendered post totals. Fixtures do not contact providers or spend API credits.

The shared browser became signed in during the audit. TikTok showed a saved follower count. One live X refresh retrieved account counters (412 followers and 3,816 account posts) but failed to collect posts, leaving a zero-post sample and a generic saved failure warning. This identifies post collection as the broken boundary; it does not establish the upstream cause. The Vercel runtime-log API denied permission, so the precise post endpoint error and provider approvals remain unverified. Production currently runs master commit 68a8c89, before these fixes. No repeated live refreshes were performed.

Counters use Prisma Int and the existing safe parser rejects values above 2,147,483,647. Supporting larger counters requires a reviewed storage migration and serialization update. Keep that boundary explicit rather than truncating values.

Selected posts are a stored sample. Their cumulative counts can have different measurement times and API/CSV sources. They are not period-only engagement, reach, or a complete activity census. Signal's activity score can undercount activity outside its stored sample.

Signal has two budget layers: collection attempts (12 Free / 48 Pro daily) and configurable API usage allowances (defaults 2 Free / 8 Pro daily), plus shared daily/monthly caps. Failed external attempts count because providers can charge for them. UI guidance must preserve the limit actually reached.

## Build direction

Use Boomin's observed layout as inspiration: generous spacing, three short steps, and concise explanations beside results. Keep Signal's existing identity. Next priorities are a guided Connect → Collect → Understand flow, per-counter measurement evidence, and clearer sample coverage before adding more score or recommendation features. Avoid promises of complete data or free provider access.

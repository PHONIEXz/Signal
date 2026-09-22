# Activate Signal services

The app can be deployed before paid services are funded. Do not replace an existing AUTH_SECRET or TOKEN_ENCRYPTION_KEY. No new schema migration is required by this release; the earlier password-recovery, publishing and metrics upgrades must already be applied.

## Controls available now

- /dashboard/usage shows the signed-in user's daily AI, metrics and publishing reservations and allowances.
- /dashboard/operations is restricted on the server to the exact User IDs listed in SIGNAL_ADMIN_USER_IDS. Find your own ID in Turso's User table. Pro membership never grants admin access. Unlisted users receive a 404.
- SIGNAL_AI_ENABLED, SIGNAL_METRICS_ENABLED and SIGNAL_PUBLISHING_ENABLED accept true or false. Set false in Vercel, then redeploy, to pause NEW operations. In-flight operations can finish. No credit card, provider key or token is shown on the operations page.
- Daily limits reset at 00:00 UTC; monthly limits reset on the first day of the UTC month. User daily and shared daily/monthly allowances are checked in one database transaction. Failures count because providers can charge failed or interrupted work. Requests rejected by quotas do not consume reservations. Simple greetings use no AI reservation or Gemini call.
- Configure caps using the SIGNAL_* variables in .env.example. Invalid numeric values fail closed at zero. A lower shared cap can block service before an individual allowance is exhausted.
- Operations counters are NOT invoices or measured token spending. Billing can include OAuth, avatar retrieval, token refresh, provider retries and other requests outside these tracked feature operations. Set actual spending limits in provider consoles too.
- Password sign-in is capped at 10 attempts per normalised email and 300 globally per 15-minute window. These count successful attempts too. The browser receives a generic sign-in failure.

## Setup and activation

| Service | Server variables | External step | Acceptance check |
|---|---|---|---|
| Hosting | APP_URL and NEXTAUTH_URL set to the production HTTPS origin; existing AUTH_SECRET | Choose an appropriate Vercel plan and budget alerts | Sign in and load account pages |
| Turso | DATABASE_PROVIDER=turso, TURSO_DATABASE_URL, TURSO_AUTH_TOKEN | Choose capacity and backup retention | Run npm run db:turso:check against the intended database |
| AI | GEMINI_API_KEY, optional GEMINI_MODEL, SIGNAL_AI_ENABLED | Enable billing if needed; set provider spending controls | Ask one account question; verify usage rises once; disable preferences and verify no AI call |
| X | X_CLIENT_ID, X_CLIENT_SECRET | Add credits, set spending limit, configure OAuth and required read/write scopes | Reconnect, refresh a small sample; publish a test only with explicit confirmation |
| Facebook | FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, FACEBOOK_CONFIG_ID | Configure Login for Business, required Page permissions and production review | Select the intended Page; reconnect that same Page; collect posts |
| TikTok | TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET | Login Kit, scopes, redirect URI and app review | Reconnect and read profile/videos; posting remains assisted |
| Email | EMAIL_PROVIDER=resend, RESEND_API_KEY, EMAIL_FROM, EMAIL_REPLY_TO | Verify sending domain and configure DNS; fund tier only when needed | Reset a test account password and use the one-time code/link |

For each provider, configure the redirect URL as APP_URL + /api/connect/{platform}/callback. Vercel environment edits require a redeployment. Keep Preview and Production credentials/data separate wherever possible. Configured status means credentials exist, not that approval or billing has succeeded.

## Content and connection behaviour

Facebook now asks which Page to connect. An encrypted HTTP-only ten-minute cookie binds the selection to the signed-in user; Page tokens never enter client components. Discovery is bounded to 500 Pages. Reconnect the original identity; switching identities is blocked to preserve existing analytics and publishing targets. Legacy unidentified accounts with history also fail closed and need administrator review. No historical records are deleted automatically.

Content Studio keeps a best-effort recovery copy in sessionStorage for the current browser tab/user, valid for 24 hours. Restoring always creates a new draft, so it cannot overwrite a newer server revision. Save to the server for durable cross-device storage. Browser storage failure or closing the tab can lose recovery data.

## What funding does not activate

Automatic scheduled publishing, Facebook/TikTok direct image delivery, a payment checkout/subscription webhook system, sponsor campaigns and cash rewards are not implemented by this release. Planned dates remain reminders and direct publishing requires confirmation. Funding does not bypass app review or make unavailable platform metrics accessible. These need separate implementation and validation before advertising them as features.

## Launch checks

1. Configure your owner User ID and verify a normal account cannot open Operations.
2. Test each pause switch and a low allowance on a Preview deployment; check UTC reset messaging.
3. Verify the Facebook Page picker and same-account reconnect; a different identity must not replace historical data.
4. Reload Content Studio with unsaved text and restore it as a copy.
5. Complete the Get started flow with a new test account.
6. Watch provider billing alongside operation reservations before inviting the first 20 creators.

## Dependency audit follow-up

The September 21 audit prompted a Next.js 16.3.5 patch and compatible lockfile fixes for sharp, fast-uri and js-yaml. Four high-severity audit entries remain in the Prisma CLI dependency tree (deepmerge-ts/mysql2 and their parents). Signal uses SQLite/Turso rather than MySQL and the Prisma configuration is repository-controlled; this is not a claim that the advisories are harmless. Track an upstream-compatible fix before public launch. Do not run audit fix --force: its proposed Prisma 6 downgrade conflicts with the current Prisma 7 adapters. The runtime build and publishing regressions must pass after dependency updates.

Image attachments and X publishing are described in [studio-images.md](studio-images.md).

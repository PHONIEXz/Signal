# Instagram and YouTube connections

This change adds read-only connections. Provider credentials and approval are still required before live connections can be verified. No database migration is needed.

## What is implemented

| Platform | Current functionality | Deliberate limits |
| --- | --- | --- |
| Instagram | Facebook Login for Business, one linked professional account, followers, following, media count, recent media, likes and comments, saved measurements | Personal accounts are unsupported. Reach, views, saves and shares are not collected yet. CSV and account-specific AI controls remain disabled. |
| YouTube | Channel-owner OAuth with PKCE, encrypted tokens and validated renewal; official 7/28/90-day reports; views, engaged views, watch minutes, average viewing seconds and percentage, likes/comments/shares, subscribers gained/lost; daily, traffic, country, subscribed-viewer and format breakdowns; recent public-video lifetime counters | Reports load only for the current browser visit. No saved YouTube metrics, Signal Score, derived growth, AI evidence or cross-platform aggregation. Private/unlisted video details are excluded. Retention curves cover up to three recent public videos per refresh. Revenue, impression CTR and publishing are not implemented. |

Zero means a measured zero. Missing data, hidden subscribers, empty report rows and withheld breakdowns never become zero. YouTube counters retain safe integers above 2.1 billion without passing through existing Prisma Int history tables. Unsupported Instagram fields are not treated as a permanently failing collection.

YouTube Analytics dates follow America/Los_Angeles, including daylight saving time. Requested ranges are inclusive and end three reporting days before today. Processing and privacy thresholds may still omit rows. Average percentage viewed is an official average, not a retention curve. Per-video counters are cumulative and are never mixed with date-range report totals.

## Costs and restrictions

YouTube Data API usage is quota-based. This implementation does not use purchased X-style API credits. Channels, upload playlists and videos are read with bounded pagination; no search requests or uploads are made. The project's actual API Console quotas are authoritative. Extra quota can require a compliance audit, and public use can require OAuth verification. Hosting, database and optional AI services have independent costs.

Instagram uses the existing Meta app and a separate Facebook Login for Business configuration. The requirements are account eligibility, appropriate Page access, app permissions, review and rate limits. This implementation does not purchase API credits. Do not promise every metric to every account or assume app approval is automatic.

Signal's own free/Pro account limits, collection opt-out, 15-minute cooldown, daily collection allowance, global usage caps and failure counting also apply. They are Signal limits, not provider-imposed pricing. Since YouTube reports are not persisted, reloading the browser loses the report and may require waiting for Signal's cooldown. Expand caching only after the retention design below is implemented.

## Instagram setup

1. Use a Business or Creator Instagram account linked to a Facebook Page. The person authorizing needs the required access to that Page.
2. In the existing Meta app, configure Facebook Login for Business for Instagram with read permissions used by the basic collector: `instagram_basic`, `pages_show_list` and `pages_read_engagement`. Confirm the configuration returns a user token and access to the selected Page. Do not add publishing or messaging permissions.
3. Add this exact valid redirect URI: `https://signal-phoenix-dashboard.vercel.app/api/connect/instagram/callback`.
4. Set server-only `INSTAGRAM_FACEBOOK_CONFIG_ID` in Vercel. `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET` must also be set. Keep the existing Facebook configuration separate.
5. Redeploy. Accounts will replace “Setup required” with “Connect”. During consent choose exactly one eligible linked Page. The current flow refuses ambiguous/multi-page or paginated results instead of choosing a wrong identity.
6. Test your own account first. Complete Meta review and any business verification required by the app dashboard before opening access to people outside permitted app roles.

The callback exchanges the short-lived user token for a long-lived token before resolving the Page token. Signal conservatively uses the returned expiry and asks for reauthorization when that interval ends. It does not invent a permanent expiry or silently replace an account's identity.

Instagram Insights should be added as a separate reviewed increment: request `instagram_manage_insights` only when the corresponding endpoint is implemented; verify currently supported account/media metrics and periods against your approved Graph version; record metric, unit, reporting range and source separately from cumulative media counters. Permissions alone do not implement Insights.

## YouTube setup

1. Use one Google Cloud project for this production API client. Enable **YouTube Data API v3** and **YouTube Analytics API**.
2. Configure the OAuth consent screen with Signal's name, support contact, authorized production domain, homepage, Privacy Policy and Terms links. Add your Google account as a test user while the app is in Testing. Testing refresh tokens can expire after seven days.
3. Create an OAuth client of type **Web application**, dedicated to this integration. Its exact redirect URI is `https://signal-phoenix-dashboard.vercel.app/api/connect/youtube/callback`.
4. Declare only the scopes actually used: `https://www.googleapis.com/auth/youtube.readonly` and `https://www.googleapis.com/auth/yt-analytics.readonly`. Both must be granted. Google Sign-In credentials used for logging into Signal are separate.
5. Set server-only `YOUTUBE_CLIENT_ID` and `YOUTUBE_CLIENT_SECRET` in Vercel, then redeploy. Never send the secret in chat or commit it. Only readiness booleans reach the Accounts UI.
6. Connect the account or Brand Account that owns the intended YouTube channel. Signal requires exactly one returned channel and refuses a different identity on reconnect.
7. Open Accounts → YouTube → Load reports. Check the period and units against YouTube Studio, allowing for processing differences and suppressed rows. Check a real zero, hidden/rounded subscriber counts and a quota-denied response. Unlinking revokes the Google token before deleting the Signal connection.
8. Complete the required Google OAuth verification before public availability. Review the API Console quota dashboard; larger quota requests are separate from OAuth verification.

## Video retention

Each refresh requests official `elapsedVideoTimeRatio`, `audienceWatchRatio` and `relativeRetentionPerformance` reports for up to three unique recent public videos already verified as belonging to the connected channel. The date range matches the channel report. IDs are selected on the server, not provided by the caller. Curves and exact values are displayed without deriving a Signal score. Replays may make watch ratios exceed 1; these values are retained. Relative performance is YouTube’s own comparison with similarly long videos and remains on its documented 0–1 scale. Empty rows, invalid points and failed video reports do not become zero curves. Quota/authorization failures stop further requests. The existing overall request deadline and shared limits apply.

## YouTube expansion order

1. Live owner-consent validation and Studio reconciliation of each report currently implemented.
2. Persistent reports with precision-safe storage, explicit timestamps and period metadata, authorization rechecks within 30 days, deleted-video checks and scheduled cleanup. Revocation and user deletion must remove associated authorized data promptly. Do not use ordinary Signal metric history for YouTube.
3. Extend retention beyond the three-video bounded preview and add eligible official impression/CTR reports only after checking endpoint/report availability.
4. Revenue only through a separate optional monetary-consent flow for eligible YouTube Partner Program channels. Never request money scopes pre-emptively or display absent revenue as zero.
5. Derived scores/metrics only after obtaining any additional permission required by YouTube's policies. YouTube data stays out of Signal's existing AI and aggregate endpoints.

## Validation

Regression tests cover large counters, hidden subscribers, unsupported Instagram fields, real zeros, identity checks, public-only video details, pagination, quota failures, safe error messages, report schema validation, decimals, empty reports and Pacific reporting dates. Production HTTP smoke tests additionally cover owner authentication, origin protection, Instagram persistence, YouTube non-persistence, report responses, OAuth state/PKCE and token revocation. These isolated fixtures do not establish live provider approval or access.

## Primary references

- [Instagram API with Facebook Login](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-facebook-login)
- [Facebook Login for Instagram](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-facebook-login/business-login-for-instagram)
- [YouTube quotas](https://developers.google.com/youtube/v3/getting-started)
- [Quota and compliance audits](https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits)
- [YouTube Analytics channel reports](https://developers.google.com/youtube/analytics/channel_reports)
- [YouTube developer policies](https://developers.google.com/youtube/terms/developer-policies), especially authorized data, storage/revocation and derived metrics
- [Google OAuth verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification)
- [Google OAuth token lifetime](https://developers.google.com/identity/protocols/oauth2)

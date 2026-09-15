# Authentication and draft publishing

This update hides Google sign-in when credentials are not configured, checks credential sign-in results before navigation, and adds password changes in Settings. Successful changes revoke sessions and pending recovery credentials. Forgotten-password recovery offers a single-use emailed link or code and does not reveal whether an account exists.

## Enable reset emails on Vercel

Keep the existing AUTH_SECRET and TOKEN_ENCRYPTION_KEY. Set these variables in the project and redeploy:

| Variable | Value |
| --- | --- |
| APP_URL | https://signal-phoenix-dashboard.vercel.app |
| NEXTAUTH_URL | https://signal-phoenix-dashboard.vercel.app |
| AUTH_TRUST_HOST | true |
| EMAIL_PROVIDER | resend |
| RESEND_API_KEY | Your Resend API key |
| EMAIL_FROM | A sender authorized by your Resend account, for example Signal <security@your-domain> |
| SUPPORT_EMAIL | paulayoade18@gmail.com |
| EMAIL_REPLY_TO | paulayoade18@gmail.com |

Until delivery is configured, recovery reports it is unavailable instead of pretending an email was sent. Google credentials are optional. Password changes work without email delivery for users who know their current password.

## Upgrade Turso before merging

The ledger adds one table and two indexes without rewriting existing records. With your existing Turso variables, run:

```sh
git fetch origin
git switch feat/auth-draft-publishing
git pull --ff-only origin feat/auth-draft-publishing
npm ci
npm run db:turso:upgrade-publishing
npm run db:turso:check
```

The upgrade validates the schema baseline, runs in a transaction, preserves data, and is safe to repeat. Fresh databases use db:turso:setup. Local SQLite uses Prisma migrate deploy. Do not rerun the data transfer to enable publishing. Preview Content Studio needs this upgrade too.

## Editing without accidental overwrites

Content Studio keeps the saved draft in the editor after saving and labels it All changes saved / Unsaved changes. While a save is running, editor controls are disabled. Compose, Library and Calendar keep the same editor content. Replacing the editor with another draft or a blank one requires confirmation when changes are pending. Browser refresh/close and ordinary same-tab links request confirmation where the browser supports it. This is not automatic saving: mobile app termination or browser crashes can still lose unsaved text, so use Save draft.

Draft updates send the version opened in the editor. The server checks that version inside the same transaction as the content/target changes. An outdated update returns DRAFT_CONFLICT without changing the newer saved draft or delivery receipts. The editor retains your writing; use Save as copy or Refresh library and reopen the latest draft. Refreshing the library alone does not replace the editor. Clients without a version receive HTTP 428 and must reopen the draft. No additional database migration or paid service is required.

Published and uncertain deliveries remain protected from editing. Version protection does not unlock them or resend a post.

## Send from the library

Save a draft, open Library, and use Publish now. Each action confirms and sends one selected saved target. Unsaved editor changes do not change the saved content being published.

| Platform | Direct publishing | Setup |
| --- | --- | --- |
| Facebook | Text and optional Page link attachment | Add pages_manage_posts to your Facebook Login for Business configuration and reconnect the Page |
| X | Text with an optional link | Enable write access, reconnect to grant tweet.write, and have platform API access/credits |
| TikTok | Copy and open TikTok's upload page | Direct posting needs approved Content Posting API access, video.publish, creator privacy controls and video upload support |

Links are not uploaded image/video files. Opening a platform does not mark a draft published. Planned dates organize the calendar; this update does not add automatic scheduling. Expired X tokens are refreshed before publishing when a refresh token is available.

## Delivery protection

A unique draft/account ledger prevents repeated sends after success. Interrupted requests, ambiguous server failures, and missing receipts remain locked as Check platform. Receipt storage failure after remote acceptance also stays locked. Check your platform before deliberately creating another copy. Definite rejections show safe correction messages and can be retried. Published and uncertain drafts preserve their original content and history; Reuse as new prepares a separate draft.

The ledger stays separate from analytics Post and MetricSnapshot records. Publishing does not invent zero engagement measurements. Refresh analytics normally to retrieve measured results.

Studio improvements include account avatars, image/link previews, text checks, writing templates, library search/status filters, delivery receipts and calendar month navigation.

## Verification

Temporary database tests cover reset tokens/session revocation, simultaneous password changes, platform request payloads, repeated/concurrent submissions, uncertain delivery locking, storage failure, cross-user access, token refresh, and Turso data preservation. Production HTTP smoke covers login/recovery/password changes and draft validation/history protection. Platform requests are mocked; tests never publish real posts.

API references: [X create post](https://docs.x.com/x-api/posts/create-post), [Facebook Page posts](https://developers.facebook.com/docs/pages-api/posts), [TikTok Content Posting](https://developers.tiktok.com/doc/content-posting-api-get-started).
# Email code recovery

Forgot password now offers a link or a six-digit email code. Codes expire in 10 minutes, allow five attempts and revoke previous sessions after a successful reset. Both methods use the same configured email provider and registered account email. No new database migration is needed for codes. See [password recovery](password-recovery.md) for sender configuration and security details.

Signal's default contact/reply address is paulayoade18@gmail.com. You may override it with SUPPORT_EMAIL / EMAIL_REPLY_TO. EMAIL_FROM must remain an address on an owned domain verified with Resend; Gmail is a contact inbox rather than the Resend sender.

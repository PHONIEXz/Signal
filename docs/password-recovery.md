# Password recovery and branding update

This change stays on `feat/frontend-polish` / PR #5. It does not merge the separate Facebook OAuth fix, publish the app, activate a service, or change plan entitlements.

For a Turso/Vercel deployment, follow [the hosted database guide](turso-vercel-setup.md) first. The migration commands below apply to local SQLite only.

## Before starting the updated app

Use Node 24 and keep the existing `.env`. Back up the SQLite database named by `DATABASE_URL` before applying the new migration. Stop your dev server while making the backup. Do not reset the database or run `prisma migrate reset`.

```sh
npm ci
npx prisma migrate deploy
npx prisma generate
npm run test:auth
npm run test:metrics
npm run build
npm run test:auth:http
npm run dev
```

The migration adds `User.passwordVersion`, reset tokens, and request counters. Apply it before starting this version, because authentication reads the new column. Existing users, connected accounts, drafts, and metrics are retained. A normal login still permits multiple devices. A password reset invalidates old Signal sessions on their next authenticated request. It does not revoke connected social-platform credentials.

## Email delivery when ready

The forms are `/forgot-password` and `/reset-password`. Login and Settings link to recovery. Email delivery is disabled by default; the form explains this instead of claiming that an email was sent.

To enable the implemented Resend adapter, add these server-only settings to `.env` and restart Signal:

```dotenv
EMAIL_PROVIDER=resend
RESEND_API_KEY=your_sending_api_key
EMAIL_FROM="Signal <security@your-owned-domain.example>"
APP_URL=https://your-public-signal-origin.example
```

Replace the example values. The sender domain must be verified in Resend using DNS records you control. An ngrok URL can be the app's HTTPS origin, but does not give you control of an email-sending domain. Use the same app origin when opening the form. HTTP localhost is accepted in development; production requires HTTPS. `APP_URL` must have no path, query, fragment, or embedded credentials.

Resend currently offers a free tier, with a daily limit of 100 emails. The provider plan and domain registration may require spending as usage grows. No purchase is necessary to test locally, and Signal never upgrades the provider plan automatically. Check [current pricing](https://resend.com/pricing) and [sender verification](https://resend.com/docs/dashboard/domains/introduction) before activation.

Use a sending-only API key where available. Disable click tracking for authentication links, and keep reset links out of analytics and request-body logs. Reset links are secrets. Configure monitoring on the provider for rejected or bounced messages. Sending uses the [Resend Email API](https://resend.com/docs/api-reference/emails/send-email); provider acceptance is not proof of inbox delivery. Test an actual email to your own account after configuring the sender.

## Free local recovery test

Use a local test account and a development database, with the app running on localhost. Temporarily set `EMAIL_PROVIDER=local` and `APP_URL=http://localhost:3000`. Then run:

```sh
npm run dev:reset-link -- your-test-account@example.com
```

The explicit terminal command prints one private test link. It refuses production and public app origins. The web endpoint never returns or logs a reset link and never offers this local shortcut. The local command deliberately replaces any earlier reset link for that account. Opening the link changes nothing until you submit a valid new password. Refreshing after the fragment has been cleared requires reopening the email/terminal link.

Test expired links, reuse, a wrong confirmation, two old signed-in sessions, and signing in with the new password. Google-only accounts continue with Google; this flow does not add a password to them. Restore your usual `APP_URL` before testing social OAuth again.

## Security behavior

- Tokens contain 32 random bytes, are stored only as SHA-256 hashes, expire in 30 minutes, and are single-use. A fresh request replaces the previous token.
- Token redemption and password change happen in one transaction. Concurrent attempts cannot both succeed.
- Email lookup and delivery run with Next.js `after()`, following the same response for existing, missing, and Google-only emails. This avoids account-specific email-delivery timing in the response.
- Failed delivery removes only the token created by that attempt. Delivery is best-effort, not a durable queue; process shutdown can interrupt it. Request a fresh link if no email arrives.
- Persistent limits allow three reset requests per email per hour, 60 global requests per 15 minutes, and five redemption attempts per token per 15 minutes (100 global). The global cap protects a small installation but can temporarily affect all users. Add trusted edge rate limiting before broad public launch; do not blindly trust forwarded IP headers.
- Requests require JSON, a trusted Origin, and a body no larger than 4 KiB. Responses are not cached. Reset pages use no-referrer and noindex metadata.
- New/reset passwords require 12 characters and no more than 72 UTF-8 bytes to avoid bcrypt truncation. Existing shorter passwords still work until changed.
- Legacy mixed-case emails are supported. Ambiguous case-duplicate accounts fail closed and need owner-assisted cleanup.
- Successful resets increment the user's password version and remove stored sessions. The user signs in again; there is no automatic login.

These choices follow [OWASP's password recovery guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html). This update is not a full authentication security audit.

## Brand exports

`public/signal-icon.svg` uses the existing Signal wave mark from `BrandMark`. The browser favicon and Apple touch icon are generated from it with `node scripts/generate-icons.mjs`. They are committed so normal builds need no extra icon step. The header and browser title use “Your platforms, one dashboard”.

## Validation

`npm run test:auth` migrates a new temporary SQLite database, exercises reset expiry/reuse/concurrency, checks session version invalidation, rate limits and request validation, and mocks the email API. `npm run test:auth:http` runs the production server against another temporary database to check actual forms/icons, signup, reset, two old sessions and new/old password login. Both use generated local fixtures and send no real email. A production build and type check cover the pages and route signatures. Real email, Google sign-in, and social OAuth still require configured accounts and manual acceptance testing.

# Foundation audit: 25 October 2026

## Verified in the signed-in browser

The production session opened Overview, Reports, Posts, Content Studio, Accounts, an X account's analytics, Insights and Settings. Reviewed their desktop layouts and navigation. Workspace search navigated to Reports. Studio Library and Calendar tabs changed correctly. X chart weekly interval, zero baseline and the exact-measurement table worked with saved account data. WAT display was visible in the header and charts.

The X account's saved collection diagnostic reports unavailable API credit/billing access for posts. Existing account counters remain visible. This is an external collection restriction, not a passed post-fetch check. No provider refreshes, AI generation, publishing, disconnections or security-setting writes were initiated during the audit.

A fresh phone viewport check, a complete logout/login cycle and production password recovery were not performed. The isolated HTTP suite covers password/session/reset regressions without sending real email.

## Fixes

- The account Refresh button inherited both full-width and auto-width utilities. Added an explicit `fullWidth` prop and allowed the header to wrap so the control no longer squeezes its measurement label.
- The .tech hostname previously served authentication forms while APP_URL still selected the former Vercel origin. Temporary, host-scoped Next.js redirects now send login, signup, password recovery, dashboard and OAuth entries on .tech to the working origin. Public .tech pages remain available. Redirects preserve paths and queries and are not permanent-cache redirects.
- Once APP_URL is switched to the verified .tech origin and redeployed, the same rules redirect the former hostname to .tech. The helper accepts only the two known app origins; local/test origins and lookalike hosts do not enable production redirects. Session cookies are not widened across domains.

## Domain migration still pending

The .tech hostname is verified and attached to the correct Vercel project. Production authentication remains on https://signal-phoenix-dashboard.vercel.app until these exact callback URLs are registered with the existing provider apps:

- X: https://socialpanora.phoenixreborn.tech/api/connect/x/callback
- Facebook: https://socialpanora.phoenixreborn.tech/api/connect/facebook/callback
- TikTok: https://socialpanora.phoenixreborn.tech/api/connect/tiktok/callback

Retain the old callback entries during migration. Update provider website and relevant public policy/deletion links to the new hostname. Google sign-in is not enabled in the inspected production deployment.

The X console navigation redirected to general X authentication. Automatic approval review denied inspecting that origin because it could expose general social-account content outside the authorized developer-console scope. No workaround was attempted. Provider-console changes therefore remain owner actions, not completed work.

After callbacks are saved: change production APP_URL and NEXTAUTH_URL to https://socialpanora.phoenixreborn.tech, align the unused legacy TIKTOK_REDIRECT_URI configuration, redeploy, then verify new-domain sign-in, reset links, account connection callbacks and former-domain redirects. A separate sign-in may be needed on the new hostname because cookies remain host-scoped.

## Validation

All 126 automated tests passed, including five canonical-domain tests run through Next.js's redirect configuration evaluator. ESLint, TypeScript, production build and the isolated HTTP smoke suite passed. This does not certify live provider authorizations or mobile usability.

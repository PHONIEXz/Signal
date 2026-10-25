# SocialPanora workspace refresh

## Design

The public site uses bold editorial typography and a framed cobalt product illustration, inspired by Homio. Warm paper, forest green and lime accents reflect HopeRoot. Plenum informs the restrained application panels, clear action hierarchy and short state transitions. Reference artwork and videos are not shipped.

Manrope is self-hosted (Latin variable WOFF2, about 25 KB); its OFL license is included. No animation or UI framework was added. The public preview uses explicitly labelled sample data. Actual metrics, publishing, permissions, plan limits and AI preferences keep their existing data flows.

## Changes

- Landing page, interactive preview, consistent action colours and stronger page titles.
- Tablet navigation uses the compact bottom bar until 1024 px. Mobile labels are readable and horizontally scrollable. Insights is now reachable in the main navigation.
- Dashboard puts metrics before account management and removes the oversized promotional banner.
- Removed duplicate header legal links, unused decorative CSS, perpetual logo animation and a hard-coded development tunnel origin.
- Theme state follows the document without an effect-driven extra render; blocked storage does not break switching.
- Tag saves now require an explicit action and show success/failure. Requests validate type, size, origin and ownership.
- Settings reject invalid bodies and prevent overlapping optimistic updates.
- Recent-post sampling shows a pending state and keeps scroll position. Chart selection exposes its pressed state and disables chart animation.
- Shared inputs merge caller classes with their base styles. Fixed the dashboard error link and existing lint errors.

## Verification

- `npm test`: 89 tests passed, including new settings/tag boundary regressions.
- `npm run lint`: passed.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed.
- `npm run test:auth:http`: passed against an isolated temporary SQLite database. Includes sign-in, password/session flows, draft validation/history, provider failure fixtures, metric imports and ownership checks.

These checks do not prove live provider credentials, real social publishing or a production database migration. No production data, credentials or environment settings were changed. Browser visual verification is tracked in the pull request because the remote browser cannot reach the local runtime.

The review covered application structure, shared components, primary pages and API boundaries, with the existing test suite exercising metric and publishing logic. It is not an assertion that every possible defect has been eliminated.

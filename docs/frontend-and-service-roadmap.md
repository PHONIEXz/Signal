# Signal frontend and service readiness

## Included in this update

Password recovery, password visibility controls, recoverable login/signup errors, consistent Signal icons and tagline, dashboard loading/error screens, a keyboard skip link, and readable primary buttons in both themes. Existing entrance/hover animations and reduced-motion support are retained. Public auth screens describe platforms without pretending they are live connected accounts.

No runtime dependency was added. Local recovery tests and these visual improvements need no paid API. Resend delivery is implemented and can be enabled with a verified sender and server configuration. Test real delivery before relying on it.

## What adding credentials can activate

| Capability | Current implementation | Remaining requirement |
| --- | --- | --- |
| Password reset email | Implemented in this PR; disabled by default | Resend key, verified sender, HTTPS app origin, inbox test |
| X metrics | Existing API routes | Valid connection and enough API credits/access; refresh after restoring access |
| Gemini insights | Existing integration and preference controls | Valid key and provider quota; test the selected model |
| Facebook/TikTok | Existing connection routes | Correct app permissions, eligible accounts and review where required; Facebook fix remains in separate PR #4 |
| Paid Signal plans | Existing plan limits | A payment integration is not implemented here; funding alone will not enable checkout |
| Automatic publishing | Draft storage exists | Publishing APIs, permissions, a reliable scheduler and retry handling still need implementation |

Keep credentials server-side and usage limits explicit. Do not label planned tools as operational or enable checkout before payment ownership, provider, currency and webhook handling are decided.

## Design research and next choices

[Buffer Insights](https://buffer.com/insights) emphasizes understandable performance and actionable next steps. [Metricool](https://metricool.com/) brings planning and analytics into one workspace. Signal keeps its own identity; the useful patterns are clear states, consistent navigation, and a short path from a finding to a saved draft.

Candidate next increments, pending the owner's priority:

1. **Daily Mission:** one evidence-backed action based on stored metrics, with the source sample and last update visible. Use deterministic rules first, so it can work without an AI bill.
2. **Content calendar:** build on the existing scheduled draft dates with a week view and unscheduled queue. Clearly distinguish planned drafts from posts actually published.
3. **Data freshness:** show when each platform last refreshed, distinguish missing data from zero, and offer one relevant next action on quota or connection errors.

Larger features such as predictions, competitor analysis, billing and automatic publishing need their own scope and validation. This PR does not claim those features are ready to activate with a key.

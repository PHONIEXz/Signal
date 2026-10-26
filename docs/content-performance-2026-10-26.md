# Content evidence, 26 October 2026

Each platform's Posts page now offers metric links for likes/reactions, comments/replies and views. Up to three posts with the highest known count are shown from the existing latest-50 saved-post query. The page reports measured coverage, tie count, publication date and saved date. Null counts are excluded, zero is preserved, and a single measured post cannot establish a comparison. Facebook post views and unverified/content-only collection states are not ranked.

Audience context uses up to 90 owner-scoped snapshots in the last 30 days and lists loaded posts published between the first and last actual observation. This is descriptive overlap, not causal attribution or equal-age testing. Missing timestamps do not invent coverage. Existing collection diagnostics, API-credit warnings and source-measurement cards remain visible. There are no extra hosted-model or provider calls, database migrations or permission changes.

Validation: 132 software tests pass, including ranking/tie/missing-count/unsupported-metric and temporal-overlap regressions. Lint, type checking, production Webpack build and isolated HTTP checks passed. HTTP checks include the new content panel and views selection. Deployment and visual review are separate checks.

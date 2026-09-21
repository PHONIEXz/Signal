# Reliability batch 1

This batch enforces both AI Insights and Personalised Recommendations on the server for all four current account/post AI routes. Either setting being off prevents account evidence reads and provider calls. All current AI features use personalised data, so there is no generic AI fallback in this release. Settings changes affect subsequent requests; they do not cancel a request already accepted.

AI request bodies are limited to 32 KiB and checked for an allowed origin. Unexpected failures return a safe message with a support reference. Logs contain the reference and event type, never raw provider error objects. Reports are generated on demand and malformed report structures are rejected before reaching the view.

Refresh responses distinguish cache, running, partial, empty, updated and failed outcomes. Internal collection warnings remain in storage and are no longer sent by refresh endpoints or rendered in the data details card. Failed post collections return HTTP 502. Facebook completeness excludes unsupported per-post views and quotes, while unavailable counts remain null.

## Verification

- TypeScript check.
- Regression tests: AI privacy gates on each actual route, bounded requests, origin validation, error redaction, report shape validation, refresh states and Facebook capabilities.
- Existing metric, collector, post retrieval and AI evidence tests.
- No production credentials, paid API calls, live publishing or production data changes required.

## Still outstanding

This is the first audit batch. It does not yet implement login throttling, AI usage budgets, identity-safe reconnects/Page selection, sample-cache redesign, durable scheduling or administrative diagnostics UI. Existing saved partial states update after the next collection. PR #14's Facebook field-query and display changes remain separate and must be reconciled before both are merged.

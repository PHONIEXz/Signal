# Reports: performance snapshot

Reports now includes a saved-data performance snapshot before the optional AI analysis. It uses the signed-in user's selected account, or all their connected accounts, and the existing plan-limited post sample selector. Invalid or foreign account selections do not render a snapshot or export control.

Each account shows its latest recorded followers and total account posts, measurement time, observed follower change within 30 days, saved-post sample availability, collection source/status and actual comparison interval. Comparisons use up to 90 latest observations; truncation and stale observations are disclosed. Missing values remain unavailable and no cross-platform unique audience total is calculated. Saved-post availability is a count of stored posts, not proof that engagement metrics were collected. There are no new provider refreshes or AI requests.

Download snapshot CSV exports only the displayed accounts, with UTC timestamps, exact observation coverage, source/status and limitations. User-controlled text is quoted and formula-like values are neutralized; each filename includes a timestamp and unique suffix. Downloads are not automatically stored on the server. Reload Reports to prepare a new snapshot from currently saved data.

Validation: unit coverage for missing and zero values, stale/future observations, actual comparison intervals and CSV safety. HTTP checks cover snapshot rendering and suppression for a foreign account selection. No schema migration or new dependency is required.

# Saved metrics when changing samples

An account detail page first looks for snapshots matching the selected post count. If none exist, it displays the latest non-legacy snapshot belonging to that account, with an explicit label stating the saved sample size and inviting a refresh for the new selection.

The fallback never creates a snapshot, changes totals, calls a provider, consumes quota, or enters the selected sample's growth history. Exact-sample history and AI requests remain scoped to the selection. The metrics panel resets transient refresh messages when switching samples. An account without verified snapshots still receives a first-refresh prompt.

Manual check: collect 10 posts, select 5 before collecting it, and verify that saved 10-post totals remain labelled as 10. Refresh 5 and verify the exact sample replaces them. Account ownership is resolved before either snapshot query.

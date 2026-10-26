# Chunk 4: saved post to draft

Saved post cards with text now link to Content Studio. The server loads only posts belonging to the signed-in user. A reference panel displays the source account and text; copying requires an explicit click. Copying creates an unsaved editor draft, selects the source account and clears media and scheduling. Existing unsaved edits retain their confirmation guard. Browser recovery must be resolved first. Saving and publishing remain separate existing actions.

This is reuse of source material, not an AI rewrite or a claim that the post performed well. Review dates, claims, destination and platform limits before saving. The source panel is navigation context, not persistent provenance on saved drafts. No provider calls, new permissions or database migrations are introduced.

## Validation

- 132 unit tests passed.
- Lint, TypeScript, webpack production build and isolated HTTP smoke passed.
- HTTP coverage checks owned source rendering and rejects another user's source without leaking text.
- Signed-in production checks of chunks 2–3: 7/30/90-day comparison controls; actual observation ranges; Facebook reactions/comments missing-data states; Facebook per-post views limitation; collection diagnostics and audience-overlap explanation.
- Phone layout, fit and speed: passed as reported by the owner, not independently reproduced by this audit.
- No paid refresh or real publication was performed during browser verification.

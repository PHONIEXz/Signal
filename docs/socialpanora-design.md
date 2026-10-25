# SocialPanora visual refresh

The internal workspace follows the hierarchy, pale grey canvas, restrained blue accents and white modular panels in [Dipa Inhouse’s Shopeers dashboard](https://dribbble.com/shots/26628350-Shopeers-AI-Powered-B2B-eCommerce-Analytics-Dashboard). The public page follows the centred hero, yellow highlights, raised illustration tiles and light-to-dark section progression in [Outcrowd’s analytics landing concept](https://dribbble.com/shots/26455331-Landing-Page-for-a-Data-Driven-Analytics-Platform).

These are visual references. SocialPanora uses original code-native artwork, its own product copy and existing social analytics functions. No reference artwork, customer claims, eCommerce metrics or pricing are copied into the application.

## Shared workspace

All dashboard routes inherit the same sidebar, header, typography, panel, table and form treatment. Page search filters local navigation destinations; it does not send user input to an AI provider. Mobile navigation retains every destination and scrolls horizontally when needed.

The overview adds a selectable per-channel history chart. Each account query is bounded at 91 snapshots: 90 are shown, and the extra record determines whether to display the truncation notice. Historical sample likes/views are filtered to the chosen post sample size. Cross-platform totals, missing-data labels, account ownership, score calculation and provider operations keep their existing semantics. The full account history remains separately available.

Charts retain exact-value tables, linear interpolation, missing-period markers, focused/zero scale controls and the existing period semantics. Detailed reading guidance is in a disclosure panel. Colour, typography and grid changes do not manufacture data or smooth recorded values.

## Motion and accessibility

Decorative tiles use a single entrance animation. The interactive public preview plays only after the user chooses Play, with pause and reduced-motion support. Native links, labelled inputs, pressed-state controls, focus indicators and responsive layouts remain in use. The dark landing sections are a visual progression and do not overwrite the user’s saved theme.

## Domain migration

The custom .tech hostname is the canonical production origin. APP_URL, AUTH_URL and NEXTAUTH_URL use https://socialpanora.phoenixreborn.tech. The former Vercel hostname redirects to .tech, and provider callback URLs use the new origin. Existing host-scoped sessions may require signing in again. See the dated foundation audit for the earlier staged migration and its remaining verification limits.

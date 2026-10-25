# SocialPanora

**Your social world. One clear view.**

SocialPanora, formerly Signal, is a social media workspace for connected-account analytics, metric history, AI-assisted insights, reports and content drafts. Missing platform data is labelled unavailable rather than invented.

Live app: https://signal-phoenix-dashboard.vercel.app/

## Development

Use Node.js 24. Install dependencies with `npm ci`, configure the variables documented in `.env.example`, then run `npm run dev`. Keep credentials private.

```sh
npm test
npm run lint
npm run build
```

Built with Next.js, React, TypeScript, Prisma, Turso, NextAuth, Tailwind CSS and Google AI. Platform access and optional features depend on credentials, permissions and service allowances.

## Operations and integrations

- [Authentication and publishing](docs/auth-and-publishing.md)
- [Service activation](docs/service-activation.md)
- [Daily metrics](docs/daily-metrics.md)
- [Turso and Vercel setup](docs/turso-vercel-setup.md)
- [Facebook review preparation](docs/facebook-app-review.md)

## Rename compatibility

The public product name is SocialPanora. The existing repository, deployment URL, OAuth callback URLs, `SIGNAL_*` configuration variables, database model names, internal component identifiers and storage keys remain compatible with the existing installation. The former icon URL also remains available for cached clients. This branding update requires no database migration or reconnection.

External Google, Meta, X and TikTok developer-console display names are managed separately. Some provider screens may still say Signal until those app profiles are updated; historical provider names in review notes are retained accurately.

Created by Paul Ayoade David (Phoenix).

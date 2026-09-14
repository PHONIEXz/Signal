# Signal with Turso and Vercel

## What each service does

- ngrok forwards a public URL to the app running on your laptop. It does not store Signal's database.
- Turso stores the hosted database. This integration uses its libSQL engine, supported by the Prisma libSQL adapter.
- Vercel runs the deployed Next.js app. Its local filesystem is not a permanent shared database.

References: [ngrok](https://ngrok.com/docs/start), [Turso SDK](https://docs.turso.tech/sdk/ts/reference), [Vercel storage limitation](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel).

## 1. Get the updated code

Use Node 24 in the Signal project folder. Keep `.env` private and back up your existing local SQLite database. These commands do not merge the PR:

```sh
git status --short
git fetch origin
git switch feat/frontend-polish
git pull --ff-only origin feat/frontend-polish
npm ci
```

If Git reports local changes or a conflict, stop and keep those changes before switching. Do not use force checkout, hard reset or database reset. `npm ci` now generates the Prisma client automatically.

## 2. Keep local mode while preparing Turso

Your local `.env` should contain:

```dotenv
DATABASE_PROVIDER=sqlite
DATABASE_URL="file:./dev.db"
TURSO_DATABASE_URL="libsql://your-database.turso.io"
TURSO_AUTH_TOKEN="your-private-token"
```

Use the actual Turso URL/token from your dashboard. Merely adding credentials does not switch the running app. The two commands below always target Turso, independently of `DATABASE_PROVIDER`:

```sh
npm run db:turso:setup
npm run db:turso:check
```

`setup` initializes only an empty database. Its CREATE-only baseline and marker are written in one transaction; it does not replay old Prisma table rewrites. It refuses unrelated existing tables and never copies or deletes local data. Repeating setup on the same intact baseline preserves existing records. `check` verifies the connection, required tables/columns/indexes, and foreign-key integrity without changing data. Neither command prints tokens or account records. A fresh database reports 11 Signal tables.

If authentication fails, check that the token is valid for this database and has write access for setup. If tables already exist without the Signal setup marker, stop and inspect their origin. Do not delete them to bypass the guard.

## 3. Decide what happens to existing data

Initializing Turso makes tables, not copies of your existing accounts, drafts or metrics. To transfer existing data, stop every Signal app process and keep DATABASE_PROVIDER=sqlite and your original DATABASE_URL. Run:

```sh
npm run db:turso:transfer -- --app-stopped
```

The command saves original.db and transfer.db in a private, Git-ignored `.backup-turso-*` directory. It applies pending Prisma migrations only to transfer.db, checks local integrity and token decryption, then copies all 11 application tables in a single remote transaction. Password hashes, IDs, dates and encrypted tokens are preserved. Every column value is compared before commit. A retry accepts an identical destination; different existing records stop the transfer without overwriting anything. Migration metadata stays local. No secret values are logged.

Keep the app stopped until the command reports verified success and you switch to Turso. Do not sign up or write to the destination before copying. Remote transaction limits can cause a large transfer to fail and roll back; send the error for a staged migration if retries cannot finish. Backups contain private records and should stay on your machine. Keep your original TOKEN_ENCRYPTION_KEY and use it on Vercel too. No new dependencies are needed for this command.

For a transfer, keep the same token-encryption key, pause app writes, back up the source, apply any missing local migrations to a copy, transfer records in relationship order to an empty destination, and compare counts and representative dates/relationships before switching. The baseline uses the same ISO-8601 Prisma adapter timestamp format as local SQLite. Never run historical Prisma table-rebuild migrations against the populated Turso database as an import shortcut.

If you choose a fresh database, new signup is expected. Existing local logins and connected-account records will not appear until imported or recreated.

## 4. Test Turso from your laptop

After setup and the data decision, change only:

```dotenv
DATABASE_PROVIDER=turso
```

Keep `DATABASE_URL=file:./dev.db` for local Prisma CLI workflows. Restart `npm run dev`. Check signup/login, a dashboard read, and a saved draft using a test account. Returning `DATABASE_PROVIDER` to `sqlite` and restarting returns to your local database; remote changes are not synchronized back.

The local-only reset-link shortcut intentionally refuses Turso mode. Real email delivery remains disabled until a verified sender is configured.

## 5. Prepare Vercel, then deploy when ready

Before triggering the deployment, add these in the Vercel project's environment variables:

| Variable | Value |
| --- | --- |
| DATABASE_PROVIDER | turso |
| TURSO_DATABASE_URL | Turso database URL |
| TURSO_AUTH_TOKEN | Private database token |
| AUTH_SECRET | Strong existing/generated authentication secret |
| AUTH_TRUST_HOST | true |
| TOKEN_ENCRYPTION_KEY | Existing encryption key if importing connections |
| APP_URL | The chosen stable HTTPS production URL, with no trailing path |
| NEXTAUTH_URL | The same production origin if this variable is used |
| EMAIL_PROVIDER | disabled until a sender is configured |

Add Google/social/AI credentials only for integrations you want enabled. Never use `NEXT_PUBLIC_` for secrets. A Vercel app refuses local SQLite and missing Turso credentials instead of silently writing to an ephemeral file. Prisma generation itself uses the local CLI URL and needs no live database.

Use a separate database and credentials for preview deployments if you enable them. Do not give every preview branch the production database token. This PR is still draft; hosting is not activated by these code changes.

Update Google, Facebook, X and TikTok callback allowlists to the stable Vercel URL when moving the app. The ngrok callback registrations can remain for local testing. No social integration is repaired simply by changing database providers; the Facebook fix remains in PR #4.

## Future database changes

`prisma/turso/bootstrap.sql` is a fresh-database baseline, not a general migration runner. A checksum ties it to `prisma/schema.prisma`; a schema change blocks these scripts until a reviewed Turso migration/baseline update is prepared. Existing databases require additive, reviewed migrations and a backup before schema changes. Do not point `prisma migrate deploy` at the remote libSQL URL or replace old migration history.

## Verification performed

Local libSQL tests exercise schema creation, repeat setup preserving records, refusal of populated unknown databases, rollback on invalid schema SQL, required-column detection, Prisma writes/reads and transactions, and provider selection. The password-recovery suite also passes with explicit local isolation. These tests do not prove your remote token, network path, provider quotas, or production deployment work: `db:turso:check` on your laptop is the next remote check.

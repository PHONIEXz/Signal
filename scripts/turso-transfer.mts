import { createRequire } from "node:module";
import { mkdirSync, chmodSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import { createClient } from "@libsql/client/web";
import { databaseConfig, tursoConfig } from "../lib/database-config.ts";
import { bootstrapSql } from "../lib/turso-setup.ts";
import { decrypt } from "../lib/encryption.ts";
import { quote, transferTables, TransferError, type TransferTable } from "../lib/turso-transfer.ts";
import { diagnosticCode } from "../lib/transfer-diagnostics.ts";

let stage = "checking configuration";
function progress(next: string) { stage = next; console.log("Transfer step: " + next); }

async function main() {
  if (!process.argv.includes("--app-stopped")) throw new TransferError("Stop Signal first, then run npm run db:turso:transfer -- --app-stopped.");
  const config = databaseConfig();
  if (config.provider !== "sqlite") throw new TransferError("Keep DATABASE_PROVIDER=sqlite until the transfer is verified.");
  const remote = tursoConfig();
  const path = resolve(config.url.slice(5));
  if (!statSync(path).isFile()) throw new TransferError("Local database file not found.");
  const require = createRequire(import.meta.url);
  progress("backing up local database");
  const Database = require("better-sqlite3");
  const folder = resolve(".backup-turso-" + Date.now());
  mkdirSync(folder, { mode: 0o700 });
  const original = join(folder, "original.db");
  const snapshot = join(folder, "transfer.db");
  const source = new Database(path, { readonly: true, fileMustExist: true });
  try { await source.backup(original); await source.backup(snapshot); } finally { source.close(); }
  chmodSync(original, 0o600); chmodSync(snapshot, 0o600);
  console.log("Local backup saved in " + folder);
  // Upgrade only the transfer snapshot. The original database remains untouched.
  progress("migrating transfer snapshot");
  try {
    execFileSync(process.execPath, [require.resolve("prisma/build/index.js"), "migrate", "deploy"], {
      env: { ...process.env, DATABASE_URL: "file:" + snapshot.replaceAll("\\", "/"), DATABASE_PROVIDER: "sqlite" },
      stdio: "pipe",
    });
  } catch { throw new TransferError("Snapshot migration failed. Original database is unchanged. Send this message for diagnosis."); }
  progress("opening transfer snapshot");
  const db = new Database(snapshot, { readonly: true, fileMustExist: true });
  db.defaultSafeIntegers(true);
  const sql = bootstrapSql();
  const tables: TransferTable[] = [];
  try {
    progress("checking local integrity");
    if (db.pragma("integrity_check")[0].integrity_check !== "ok" || db.pragma("foreign_key_check").length) throw new TransferError("Local database integrity check failed.");
    for (const [, name, definition] of sql.matchAll(/CREATE TABLE "(\w+)" \(([\s\S]*?)\n\);/g)) {
      progress("reading " + name);
      const columns = [...definition.matchAll(/^\s+"(\w+)"/gm)].map(m => m[1]);
      const actual = db.prepare("PRAGMA table_info(" + quote(name) + ")").all().map((r: { name: string }) => r.name);
      if (JSON.stringify([...columns].sort()) !== JSON.stringify(actual.sort())) throw new TransferError("Snapshot columns differ from Signal's schema. Transfer stopped.");
      tables.push({ name, columns, rows: db.prepare("SELECT " + columns.map(quote).join(",") + " FROM " + quote(name)).raw().all() });
    }
    progress("checking local table coverage");
    const allowed = new Set([...tables.map(t => t.name), "_prisma_migrations"]);
    for (const row of db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()) {
      if (!allowed.has(row.name)) throw new TransferError("Local database contains an unknown table. Transfer stopped to avoid leaving data behind.");
    }
    progress("checking connection encryption key");
    for (const row of db.prepare('SELECT accessToken, refreshToken FROM ConnectedAccount').all()) {
      try { decrypt(row.accessToken); if (row.refreshToken) decrypt(row.refreshToken); }
      catch { throw new TransferError("TOKEN_ENCRYPTION_KEY cannot decrypt an existing connection. Restore the original key before transferring."); }
    }
  } finally { db.close(); }
  if (!tables.find(t => t.name === "User")?.rows.length) throw new TransferError("No users found in the source database. Check DATABASE_URL before transferring.");
  progress("creating remote client");
  const client = createClient({ ...remote, intMode: "bigint" });
  try {
    const outcome = await transferTables(client, sql, tables, progress);
    console.log(outcome === "transferred" ? "Transfer committed and verified." : "Existing Turso records match the snapshot. Verified without changes.");
    console.table(tables.map(t => ({ table: t.name, records: t.rows.length })));
    console.log("Keep the same TOKEN_ENCRYPTION_KEY on Vercel. Original local database was not changed.");
  } finally { client.close(); }
}
main().catch(error => {
  console.error("Transfer stopped at: " + stage + ". Diagnostic: " + diagnosticCode(error));
  console.error(error instanceof TransferError ? error.message : "Send the transfer step and diagnostic above. Original local database is unchanged. Keep Signal stopped and DATABASE_PROVIDER=sqlite until the result is checked.");
  process.exitCode = 1;
});

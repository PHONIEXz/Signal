import { createClient } from "@libsql/client/web";
import { readFileSync } from "node:fs";
import { tursoConfig } from "../lib/database-config.ts";
import { bootstrapSql } from "../lib/turso-setup.ts";
import { upgradePublishing } from "../lib/turso-publishing-upgrade.ts";
const client = createClient(tursoConfig());
try {
  await upgradePublishing(client, bootstrapSql(), readFileSync(new URL("../prisma/migrations/20260915100000_content_publishing/migration.sql", import.meta.url), "utf8"));
  console.log("Publishing schema ready. Existing records were preserved.");
} catch { console.error("Publishing migration failed. No credentials were logged. Check connection and schema before deploying."); process.exitCode = 1; }
finally { client.close(); }

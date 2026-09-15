import {createClient} from "@libsql/client/web";
import {readFileSync} from "node:fs";
import {tursoConfig} from "../lib/database-config.ts";
import {bootstrapSql} from "../lib/turso-setup.ts";
import {upgradeMetrics} from "../lib/turso-metrics-upgrade.ts";
if(!process.argv.includes("--app-stopped")) {console.error("Stop local collection and pause Vercel traffic for this database upgrade, then pass --app-stopped. Export a Turso backup first.");process.exitCode=1;}
else {
  const client=createClient(tursoConfig());
  try {await upgradeMetrics(client,readFileSync(new URL("../prisma/turso/pre-metrics.sql",import.meta.url),"utf8"),bootstrapSql(),readFileSync(new URL("../prisma/migrations/20260916000000_metric_history/migration.sql",import.meta.url),"utf8"));console.log("Metrics history schema ready. Original counters were archived as unverified legacy data; users, posts, tags, drafts and connections were preserved.");}
  catch{console.error("Metrics upgrade stopped. No credentials or record contents were logged. Check the database baseline and connection before deploying.");process.exitCode=1;}finally{client.close();}
}

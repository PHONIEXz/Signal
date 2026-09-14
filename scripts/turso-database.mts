import { createClient } from "@libsql/client/web";
import { tursoConfig } from "../lib/database-config.ts";
import { bootstrapSql, checkTursoSchema, initializeEmptyTurso } from "../lib/turso-setup.ts";

async function main() {
  const command = process.argv[2];
  if (command !== "setup" && command !== "check") throw new Error("Use npm run db:turso:setup or npm run db:turso:check.");
  const client = createClient(tursoConfig());
  try {
    const sql = bootstrapSql();
    if (command === "setup") {
      const outcome = await initializeEmptyTurso(client, sql);
      console.log(outcome === "created" ? "Signal tables created. No local records were copied." : "Signal tables are already ready. Existing records were preserved.");
    }
    const tables = await checkTursoSchema(client, sql);
    console.log("Turso connection OK. Signal schema OK (" + tables + " tables).");
  } finally { client.close(); }
}

main().catch((error: unknown) => {
  // Library errors may include URLs or request context. Don't print those.
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : undefined;
  console.error(code ? "Turso operation failed (" + code + "). Check credentials, database permissions, and network access."
    : error instanceof Error ? error.message : "Turso setup failed.");
  process.exitCode = 1;
});

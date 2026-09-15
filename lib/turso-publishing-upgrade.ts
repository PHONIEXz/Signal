import type { Client } from "@libsql/client";
import { hashSchema, checkTursoSchema } from "./turso-setup.ts";
const PREVIOUS_BASELINE = "b4a41a9cd87df114661840ba969b27c2923848f255c98c16386c6fd697d66696";
export async function upgradePublishing(client: Client, sql: string, migration: string) {
  const previous = sql.slice(0, sql.indexOf('\nCREATE TABLE "ContentPublication"')).trimEnd() + "\n";
  await checkTursoSchema(client, previous);
  const tx = await client.transaction("write");
  try {
    const markerTable = await tx.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='_SignalBootstrap'");
    if (markerTable.rows.length) {
      const marker = await tx.execute("SELECT hash FROM _SignalBootstrap WHERE id=1");
      if (![PREVIOUS_BASELINE, hashSchema(sql)].includes(String(marker.rows[0]?.hash))) throw new Error("Unknown database baseline. Migration stopped without changing records.");
    }
    await tx.executeMultiple(migration.replace('CREATE TABLE ', 'CREATE TABLE IF NOT EXISTS ').replaceAll('CREATE UNIQUE INDEX ', 'CREATE UNIQUE INDEX IF NOT EXISTS ').replaceAll('CREATE INDEX ', 'CREATE INDEX IF NOT EXISTS '));
    await checkTursoSchema(tx, sql);
    if (markerTable.rows.length) await tx.execute({ sql: "UPDATE _SignalBootstrap SET hash=? WHERE id=1", args: [hashSchema(sql)] });
    await tx.commit();
  } catch (error) { if (!tx.closed) await tx.rollback(); throw error; }
  finally { tx.close(); }
}

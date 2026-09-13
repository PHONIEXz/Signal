import { createHash } from "node:crypto";
import type { Client, InValue } from "@libsql/client";
import { checkTursoSchema } from "./turso-setup.ts";

export type TransferTable = { name: string; columns: string[]; rows: InValue[][] };
export class TransferError extends Error {}
export const quote = (name: string) => '"' + name.replaceAll('"', '""') + '"';
export function fingerprint(rows: unknown[][]) {
  const encoded = rows.map(row => JSON.stringify(row.map(value => {
    if (typeof value === "bigint" || typeof value === "number") return ["number", String(value)];
    if (value instanceof ArrayBuffer) return ["blob", Buffer.from(value).toString("hex")];
    if (ArrayBuffer.isView(value)) return ["blob", Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString("hex")];
    return value;
  }))).sort();
  return createHash("sha256").update(JSON.stringify(encoded)).digest("hex");
}

// All inserts and verification share one transaction. A timeout rolls back the copy.
export async function transferTables(client: Client, sql: string, tables: TransferTable[]) {
  await checkTursoSchema(client, sql);
  const expected = [...sql.matchAll(/CREATE TABLE "(\w+)"/g)].map(m => m[1]);
  if (JSON.stringify(tables.map(t => t.name)) !== JSON.stringify(expected)) throw new TransferError("Source table list does not match Signal's schema.");
  const tx = await client.transaction("write");
  try {
    const verify = async () => {
      for (const table of tables) {
        const result = await tx.execute("SELECT " + table.columns.map(quote).join(",") + " FROM " + quote(table.name));
        if (fingerprint(result.rows.map(row => table.columns.map(c => row[c]))) !== fingerprint(table.rows)) return false;
      }
      return true;
    };
    let populated = false;
    for (const table of tables) {
      const result = await tx.execute("SELECT count(*) AS n FROM " + quote(table.name));
      populated ||= Number(result.rows[0].n) > 0;
    }
    if (populated) {
      if (!await verify()) throw new TransferError("Turso contains different data. Transfer stopped without overwriting it.");
      await tx.rollback();
      return "already-verified";
    }
    for (const table of tables) {
      const statement = "INSERT INTO " + quote(table.name) + " (" + table.columns.map(quote).join(",") + ") VALUES (" + table.columns.map(() => "?").join(",") + ")";
      for (let i = 0; i < table.rows.length; i += 50) {
        await tx.batch(table.rows.slice(i, i + 50).map(args => ({ sql: statement, args })));
      }
    }
    if ((await tx.execute("PRAGMA foreign_key_check")).rows.length) throw new TransferError("Relationship verification failed. Transfer rolled back.");
    if (!await verify()) throw new TransferError("Record verification failed. Transfer rolled back.");
    await tx.commit();
    return "transferred";
  } catch (error) {
    if (!tx.closed) await tx.rollback();
    throw error;
  } finally { tx.close(); }
}

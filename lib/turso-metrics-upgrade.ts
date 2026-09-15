import type { Client } from "@libsql/client";
import { checkTursoSchema, hashSchema } from "./turso-setup.ts";
export async function upgradeMetrics(client:Client,previous:string,current:string,migration:string) {
  const tx=await client.transaction("write");
  try {
    const markers=await tx.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='_SignalBootstrap'");
    if(markers.rows.length) {const marker=await tx.execute("SELECT hash FROM _SignalBootstrap WHERE id=1");if(![hashSchema(previous),hashSchema(current)].includes(String(marker.rows[0]?.hash)))throw new Error("Unknown schema baseline. Run the publishing upgrade first.");}
    const ready=await tx.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='MetricSync'");
    if(!ready.rows.length) {
      await checkTursoSchema(tx,previous);
      // Stop rather than dropping a table referenced by an unknown integration.
      const tables=await tx.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
      for(const table of tables.rows) {const name=String(table.name).replaceAll('"','""');const keys=await tx.execute(`PRAGMA foreign_key_list("${name}")`);if(keys.rows.some(key=>key.table==="Post"))throw new Error("Unexpected Post relationship. Upgrade stopped.");}
      await tx.executeMultiple(migration);
    }
    await checkTursoSchema(tx,current);
    const columns=await tx.execute('PRAGMA table_info("Post")');
    if(columns.rows.some(c=>["likeCount","viewCount","replyCount","retweetCount","quoteCount"].includes(String(c.name))&&Number(c.notnull)!==0))throw new Error("Post count columns must allow unknown measurements.");
    if(markers.rows.length)await tx.execute({sql:"UPDATE _SignalBootstrap SET hash=? WHERE id=1",args:[hashSchema(current)]});
    await tx.commit();
  } catch(error){if(!tx.closed)await tx.rollback();throw error;}finally{tx.close();}
}

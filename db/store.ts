import { createRemoteDatabase, type WorkspaceDatabase } from "./d1-http";

export async function database() {
  let db: WorkspaceDatabase;
  if (process.env.JLCG_DATABASE_DRIVER === "d1-http") {
    db = createRemoteDatabase({
      CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
      CLOUDFLARE_D1_DATABASE_ID: process.env.CLOUDFLARE_D1_DATABASE_ID,
      CLOUDFLARE_D1_API_TOKEN: process.env.CLOUDFLARE_D1_API_TOKEN,
    });
  } else {
    const { env } = await import("cloudflare:workers");
    db = env.DB;
  }
  await db.batch([
    db.prepare(
      "CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, data TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS preferences (id TEXT PRIMARY KEY, data TEXT NOT NULL)",
    ),
  ]);
  return db;
}

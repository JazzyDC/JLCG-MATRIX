import { env } from "cloudflare:workers";
export async function database() {
  const db = env.DB;
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

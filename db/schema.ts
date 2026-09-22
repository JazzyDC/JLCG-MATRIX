import { sqliteTable, text } from "drizzle-orm/sqlite-core";
export const records = sqliteTable("records", {
  id: text("id").primaryKey(),
  data: text("data").notNull(),
});
export const preferences = sqliteTable("preferences", {
  id: text("id").primaryKey(),
  data: text("data").notNull(),
});

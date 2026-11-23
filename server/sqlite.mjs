import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { SCHEMA } from "../work/compiled/online/schema.js";
import { RoomStore } from "../work/compiled/online/store.js";

export function sqliteStore(path = ":memory:") {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const database = new DatabaseSync(path);
  database.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
  for (const sql of SCHEMA) database.exec(sql);
  const run = (sql, params = []) => {
    const statement = database.prepare(sql);
    if (statement.columns().length)
      return {
        results: statement.all(...params),
        changes: Number(database.prepare("SELECT changes() AS n").get().n),
      };
    const result = statement.run(...params);
    return { results: [], changes: Number(result.changes) };
  };
  const db = {
    async query(sql, params = []) {
      return run(sql, params);
    },
    async batch(queries) {
      database.exec("BEGIN IMMEDIATE");
      try {
        const results = queries.map((q) => run(q.sql, q.params));
        database.exec("COMMIT");
        return results;
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },
  };
  return { store: new RoomStore(db), close: () => database.close() };
}

import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Pool } from "./pool.ts";

export interface Migration {
  name: string;
  sql: string;
  checksum: string;
}

export interface MigrationResult {
  applied: string[];
  skipped: string[];
}

const NAME = /^\d{4}_[a-z0-9_]+\.sql$/;
// One arbitrary, fixed number: two runners (two CI jobs, two replicas) take turns instead of racing on the same table.
const LOCK_KEY = 7_203_411;

export function readMigrations(dir: string): Migration[] {
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const bad = files.find((f) => !NAME.test(f));
  if (bad !== undefined) throw new Error(`migration file name ${bad} does not match NNNN_name.sql`);
  const numbers = files.map((f) => f.slice(0, 4));
  if (new Set(numbers).size !== numbers.length) throw new Error("two migration files share a number");
  return files.map((name) => {
    const sql = readFileSync(join(dir, name), "utf8");
    return { name, sql, checksum: createHash("sha256").update(sql).digest("hex") };
  });
}

/**
 * Applies the migrations that have not run yet, each in its own transaction, and refuses to go on when a migration that was
 * applied has changed since (a change of history is a new migration, never an edit).
 */
export async function migrate(pool: Pool, migrations: readonly Migration[]): Promise<MigrationResult> {
  const client = await pool.connect();
  const result: MigrationResult = { applied: [], skipped: [] };
  try {
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_KEY]);
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    const done = new Map<string, string>();
    for (const row of (await client.query<{ name: string; checksum: string }>("SELECT name, checksum FROM schema_migrations")).rows) {
      done.set(row.name, row.checksum);
    }
    for (const m of migrations) {
      const known = done.get(m.name);
      if (known !== undefined) {
        if (known !== m.checksum) throw new Error(`migration ${m.name} was changed after it was applied`);
        result.skipped.push(m.name);
        continue;
      }
      try {
        await client.query("BEGIN");
        await client.query(m.sql);
        await client.query("INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)", [m.name, m.checksum]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
      result.applied.push(m.name);
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]).catch(() => undefined);
    client.release();
  }
  return result;
}

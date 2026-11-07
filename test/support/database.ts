import { randomBytes } from "node:crypto";
import { createPool, requireDatabaseUrl } from "../../src/db/pool.ts";
import type { Pool } from "../../src/db/pool.ts";

export interface TestDatabase {
  pool: Pool;
  url: string;
  drop(): Promise<void>;
}

/**
 * A database of its own for one test file, created next to DATABASE_URL's database and dropped afterwards, so files never share
 * rows and a failed run leaves nothing behind that the next one could trip over. DATABASE_URL must be a role that may create
 * databases (the throwaway server of scripts/with-postgres.sh and the CI service both are).
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  const adminUrl = requireDatabaseUrl();
  const admin = createPool(adminUrl, 1);
  const name = `kit_test_${randomBytes(6).toString("hex")}`;
  await admin.query(`CREATE DATABASE ${name}`);
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  const pool = createPool(url.toString(), 4);
  return {
    pool,
    url: url.toString(),
    async drop() {
      await pool.end();
      await admin.query(`DROP DATABASE ${name} WITH (FORCE)`);
      await admin.end();
    },
  };
}

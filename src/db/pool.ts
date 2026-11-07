import pg from "pg";

export type Pool = pg.Pool;

export function requireDatabaseUrl(env: Record<string, string | undefined> = process.env): string {
  const url = env["DATABASE_URL"];
  if (url === undefined || url === "") {
    throw new Error("DATABASE_URL is not set (for example postgres://postgres@127.0.0.1:5432/postgres; the password goes in PGPASSWORD)");
  }
  return url;
}

export function createPool(url: string, max = 4): Pool {
  return new pg.Pool({ connectionString: url, max, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 10_000 });
}

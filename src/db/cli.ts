// usage: node src/db/cli.ts wait | migrate | seed        (DATABASE_URL from the environment)
import { fileURLToPath } from "node:url";
import { migrate, readMigrations } from "./migrate.ts";
import { createPool, requireDatabaseUrl } from "./pool.ts";
import { seedContent } from "./seed.ts";
import { seedPages } from "./seed-data.ts";

const command = process.argv[2];
const pool = createPool(requireDatabaseUrl(), 2);

async function waitForDatabase(seconds: number): Promise<void> {
  const deadline = Date.now() + seconds * 1000;
  for (;;) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (error) {
      if (Date.now() > deadline) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

try {
  if (command === "wait") {
    await waitForDatabase(Number(process.env["DB_WAIT_SECONDS"] ?? 60));
    console.log("database: reachable");
  } else if (command === "migrate") {
    const result = await migrate(pool, readMigrations(fileURLToPath(new URL("../../migrations", import.meta.url))));
    console.log(`migrations: applied ${result.applied.length} (${result.applied.join(", ") || "none"}), already applied ${result.skipped.length}`);
  } else if (command === "seed") {
    const result = await seedContent(pool, seedPages);
    console.log(`seed: ${result.pages} pages, ${result.sections} sections, ${result.items} items`);
  } else {
    console.error("usage: node src/db/cli.ts wait | migrate | seed");
    process.exitCode = 2;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await pool.end();
}

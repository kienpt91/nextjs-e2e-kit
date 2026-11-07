import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { readMigrations } from "../../src/db/migrate.ts";

let dir = "";
before(() => {
  dir = mkdtempSync(join(tmpdir(), "migrations-"));
});
after(() => rmSync(dir, { recursive: true, force: true }));

const put = (name: string, sql = "SELECT 1;") => writeFileSync(join(dir, name), sql);

describe("readMigrations", () => {
  test("reads the migrations of the repository, in order, with a checksum of each", () => {
    const list = readMigrations(fileURLToPath(new URL("../../migrations", import.meta.url)));
    assert.equal(list[0]?.name, "0001_content.sql");
    assert.match(list[0]?.checksum ?? "", /^[0-9a-f]{64}$/);
  });

  test("orders by name and ignores files that are not SQL", () => {
    put("0002_b.sql");
    put("0001_a.sql");
    put("notes.txt", "x");
    assert.deepEqual(readMigrations(dir).map((m) => m.name), ["0001_a.sql", "0002_b.sql"]);
  });

  test("the checksum follows the content", () => {
    put("0003_c.sql", "SELECT 2;");
    const first = readMigrations(dir).find((m) => m.name === "0003_c.sql")?.checksum;
    put("0003_c.sql", "SELECT 3;");
    assert.notEqual(readMigrations(dir).find((m) => m.name === "0003_c.sql")?.checksum, first);
  });

  test("refuses a name that does not follow the pattern", () => {
    put("add_table.sql");
    assert.throws(() => readMigrations(dir), /does not match NNNN_name\.sql/);
  });

  test("refuses two files with the same number", () => {
    const fresh = mkdtempSync(join(tmpdir(), "migrations-"));
    try {
      writeFileSync(join(fresh, "0001_a.sql"), "SELECT 1;");
      writeFileSync(join(fresh, "0001_b.sql"), "SELECT 1;");
      assert.throws(() => readMigrations(fresh), /share a number/);
    } finally {
      rmSync(fresh, { recursive: true, force: true });
    }
  });
});

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { PgContentRepository } from "../../src/content/pg-content-repository.ts";
import { migrate, readMigrations } from "../../src/db/migrate.ts";
import { seedContent } from "../../src/db/seed.ts";
import { seedPages } from "../../src/db/seed-data.ts";
import { createTestDatabase } from "../support/database.ts";
import type { TestDatabase } from "../support/database.ts";

const migrationsDir = fileURLToPath(new URL("../../migrations", import.meta.url));
const cli = fileURLToPath(new URL("../../src/db/cli.ts", import.meta.url));

let db: TestDatabase;
before(async () => {
  db = await createTestDatabase();
});
after(async () => {
  await db.drop();
});

const count = async (table: string) => Number((await db.pool.query<{ n: string }>(`SELECT count(*) AS n FROM ${table}`)).rows[0]?.n);

describe("migrations", () => {
  test("apply once, are skipped the second time, and are recorded with their checksum", async () => {
    const migrations = readMigrations(migrationsDir);
    const first = await migrate(db.pool, migrations);
    assert.deepEqual(first, { applied: ["0001_content.sql"], skipped: [] });
    const second = await migrate(db.pool, migrations);
    assert.deepEqual(second, { applied: [], skipped: ["0001_content.sql"] });
    const rows = (await db.pool.query<{ name: string; checksum: string }>("SELECT name, checksum FROM schema_migrations")).rows;
    assert.deepEqual(rows, [{ name: "0001_content.sql", checksum: migrations[0]?.checksum }]);
  });

  test("two runners at the same moment apply a migration exactly once", async () => {
    const other = await createTestDatabase();
    try {
      const migrations = readMigrations(migrationsDir);
      const results = await Promise.all([migrate(other.pool, migrations), migrate(other.pool, migrations), migrate(other.pool, migrations)]);
      assert.equal(results.filter((r) => r.applied.length === 1).length, 1);
      assert.equal(results.filter((r) => r.skipped.length === 1).length, 2);
    } finally {
      await other.drop();
    }
  });

  test("refuse to go on when an applied migration was edited", async () => {
    const dir = await mkdtemp(join(tmpdir(), "edited-"));
    try {
      await cp(migrationsDir, dir, { recursive: true });
      const edited = readMigrations(dir).map((m) => ({ ...m, checksum: "0".repeat(64) }));
      await assert.rejects(migrate(db.pool, edited), /0001_content\.sql was changed after it was applied/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("a failing migration is rolled back completely and is not recorded", async () => {
    const broken = { name: "0002_broken.sql", sql: "CREATE TABLE half_done (id int); SELECT 1/0;", checksum: "1".repeat(64) };
    await assert.rejects(migrate(db.pool, [...readMigrations(migrationsDir), broken]), /division by zero/);
    assert.equal((await db.pool.query("SELECT to_regclass('half_done') AS t")).rows[0]?.t, null);
    assert.equal(await count("schema_migrations"), 1);
  });
});

describe("seed", () => {
  test("writes the pages, sections and items of the seed data", async () => {
    const result = await seedContent(db.pool, seedPages);
    assert.deepEqual(result, { pages: 9, sections: 15, items: 6 });
    assert.equal(await count("pages"), 9);
  });

  test("can run again and again with the same result", async () => {
    await seedContent(db.pool, seedPages);
    await seedContent(db.pool, seedPages);
    assert.deepEqual([await count("pages"), await count("sections"), await count("section_items")], [9, 15, 6]);
  });

  test("puts back what was edited by hand and leaves pages it does not know alone", async () => {
    await db.pool.query("UPDATE sections SET heading = 'Edited' WHERE heading = 'Services'");
    await db.pool.query("INSERT INTO pages (slug, title, heading) VALUES ('/mine', 'Mine', 'Mine')");
    await seedContent(db.pool, seedPages);
    assert.equal(await count("sections WHERE heading = 'Edited'"), 0);
    assert.equal(await count("pages WHERE slug = '/mine'"), 1);
    await db.pool.query("DELETE FROM pages WHERE slug = '/mine'");
  });

  test("rolls everything back when one page is invalid", async () => {
    const pagesBefore = await count("pages");
    await assert.rejects(seedContent(db.pool, [...seedPages, { slug: "Bad Slug", title: "x", heading: "x", sections: [] }]), /pages_slug_check/);
    assert.equal(await count("pages"), pagesBefore);
  });
});

describe("schema constraints", () => {
  test("a slug must look like a path", async () => {
    for (const slug of ["about", "/About", "/a b", "/a//b", "/a/"]) {
      await assert.rejects(db.pool.query("INSERT INTO pages (slug, title, heading) VALUES ($1, 't', 'h')", [slug]), /pages_slug_check/, slug);
    }
  });

  test("two sections of one page cannot take the same position", async () => {
    await assert.rejects(
      db.pool.query("INSERT INTO sections (page_id, position, kind, heading) SELECT page_id, position, kind, 'dup' FROM sections LIMIT 1"),
      /sections_page_id_position_key/,
    );
  });

  test("a call to action needs both its label and its address", async () => {
    await assert.rejects(
      db.pool.query("INSERT INTO sections (page_id, position, kind, heading, cta_label) SELECT id, 99, 'text', 'x', 'Go' FROM pages LIMIT 1"),
      /sections_check/,
    );
  });

  test("deleting a page deletes its sections and their items", async () => {
    await db.pool.query("INSERT INTO pages (slug, title, heading) VALUES ('/tmp', 't', 'h')");
    await seedContent(db.pool, [{ slug: "/tmp", title: "t", heading: "h", sections: [{ kind: "steps", heading: "S", items: [{ label: "one", body: "b" }] }] }]);
    const sectionsBefore = await count("sections");
    const itemsBefore = await count("section_items");
    await db.pool.query("DELETE FROM pages WHERE slug = '/tmp'");
    assert.deepEqual([await count("sections"), await count("section_items")], [sectionsBefore - 1, itemsBefore - 1]);
  });
});

describe("content repository", () => {
  const repository = () => new PgContentRepository(db.pool);

  test("returns the homepage with its sections in editorial order and its items in order", async () => {
    const page = await repository().findPublishedPage("/");
    assert.ok(page);
    assert.equal(page.title, "Lantern Studio | Websites that stay fast");
    assert.deepEqual(page.sections.map((s) => s.position), [1, 2, 3, 4, 5]);
    assert.deepEqual(page.sections.map((s) => s.kind), ["hero", "services", "steps", "text", "contact"]);
    assert.deepEqual(page.sections[1]?.items.map((i) => i.label), ["Audit", "Build", "Care"]);
    assert.deepEqual(page.sections[2]?.items.map((i) => i.label), ["Brief", "Build", "Launch"]);
    assert.equal(page.sections[2]?.anchor, "how-it-works");
    assert.deepEqual(page.sections[0]?.cta, { label: "Book a call", href: "/contact" });
    assert.equal(page.sections[1]?.cta, null);
  });

  test("follows a change of order made in the database", async () => {
    await db.pool.query(
      "UPDATE sections SET position = CASE position WHEN 2 THEN 3 WHEN 3 THEN 2 ELSE position END + 10 WHERE page_id = (SELECT id FROM pages WHERE slug = '/')",
    );
    const page = await repository().findPublishedPage("/");
    assert.deepEqual(page?.sections.map((s) => s.heading), ["Websites that stay fast and easy to edit", "How it works", "Services", "Recent results", "Contact"]);
    await seedContent(db.pool, seedPages);
  });

  test("answers null for an unknown page and for an unpublished one", async () => {
    assert.equal(await repository().findPublishedPage("/nothing"), null);
    assert.equal(await repository().findPublishedPage("/drafts/spring-offer"), null);
    assert.equal(await count("pages WHERE slug = '/drafts/spring-offer'"), 1);
  });

  test("lists the navigation in its order and the sitemap with the homepage first and no draft", async () => {
    assert.deepEqual(await repository().listNavigation(), [
      { href: "/about", label: "About" },
      { href: "/pricing", label: "Pricing" },
      { href: "/contact", label: "Contact" },
    ]);
    const sitemap = await repository().listSitemap();
    assert.equal(sitemap[0]?.slug, "/");
    assert.equal(sitemap.length, 8);
    assert.ok(!sitemap.some((p) => p.slug.startsWith("/drafts")));
  });

  test("treats a hostile slug as data", async () => {
    assert.equal(await repository().findPublishedPage("/'; DROP TABLE pages; --"), null);
    assert.equal(await count("pages"), 9);
  });
});

describe("command line", () => {
  const run = (command: string, env: Record<string, string>) =>
    spawnSync(process.execPath, [cli, command], { env: { NODE_ENV: "test", PATH: process.env["PATH"] ?? "", ...env }, encoding: "utf8" });

  test("migrate and seed print what they did, and wait finds the database", async () => {
    const fresh = await createTestDatabase();
    try {
      const env = { DATABASE_URL: fresh.url };
      assert.match(run("wait", env).stdout, /database: reachable/);
      assert.match(run("migrate", env).stdout, /applied 1 \(0001_content\.sql\), already applied 0/);
      assert.match(run("migrate", env).stdout, /applied 0 \(none\), already applied 1/);
      assert.match(run("seed", env).stdout, /seed: 9 pages, 15 sections, 6 items/);
    } finally {
      await fresh.drop();
    }
  });

  test("refuses to run without DATABASE_URL, with a message and a failing exit code", () => {
    const result = run("migrate", {});
    assert.equal(result.status, 1);
    assert.match(result.stderr, /DATABASE_URL is not set/);
  });

  test("an unknown command is a usage error", () => {
    const result = run("drop-everything", { DATABASE_URL: db.url });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /usage: node src\/db\/cli\.ts/);
  });

  test("a database that cannot be reached fails after the wait", () => {
    const result = run("wait", { DATABASE_URL: "postgres://nobody@127.0.0.1:1/none", DB_WAIT_SECONDS: "1" });
    assert.equal(result.status, 1);
  });
});


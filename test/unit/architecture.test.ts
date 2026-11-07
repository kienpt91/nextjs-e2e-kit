import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

/** The module specifiers a source file imports, statically or dynamically. */
export function importsOf(source: string): string[] {
  const found: string[] = [];
  for (const m of source.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)["']([^"']+)["']/g)) found.push(m[1] as string);
  return found;
}

const sources = (dir: string) => files(join(root, dir)).filter((f) => /\.(ts|tsx)$/.test(f));
const rel = (f: string) => relative(root, f);

describe("importsOf", () => {
  test("finds static, side-effect, type and dynamic imports", () => {
    const text = `import a from "x"; import "./g.css"; import type { B } from '../y.ts'; const c = await import("z"); export * from "./w.ts";`;
    assert.deepEqual(importsOf(text), ["x", "./g.css", "../y.ts", "z", "./w.ts"]);
  });
});

describe("layers", () => {
  test("the content model is pure: no database, no framework", () => {
    for (const file of sources("src/content").filter((f) => f.endsWith("model.ts"))) {
      for (const spec of importsOf(readFileSync(file, "utf8"))) assert.ok(spec.startsWith("."), `${rel(file)} imports ${spec}`);
    }
  });

  test("only src/db/pool.ts imports the database driver", () => {
    for (const file of [...sources("src"), ...sources("e2e")]) {
      if (rel(file) === "src/db/pool.ts") continue;
      assert.ok(!importsOf(readFileSync(file, "utf8")).includes("pg"), `${rel(file)} imports pg`);
    }
  });

  test("the pages and components reach the database only through src/content/server.ts", () => {
    for (const file of [...sources("src/ui"), ...sources("src/app")]) {
      for (const spec of importsOf(readFileSync(file, "utf8"))) {
        assert.ok(!/(^|\/)db\//.test(spec) && !spec.includes("pg-content-repository"), `${rel(file)} imports ${spec}`);
      }
    }
  });

  test("the database layer does not know about the pages or the framework", () => {
    for (const file of sources("src/db")) {
      for (const spec of importsOf(readFileSync(file, "utf8"))) {
        assert.ok(!/(^|\/)(ui|app)\//.test(spec) && !["react", "next"].some((p) => spec === p || spec.startsWith(`${p}/`)), `${rel(file)} imports ${spec}`);
      }
    }
  });

  test("the E2E suite is a black box: it never imports the site's source", () => {
    for (const file of sources("e2e")) {
      for (const spec of importsOf(readFileSync(file, "utf8"))) {
        assert.ok(!/(^|\/)src\//.test(spec), `${rel(file)} imports ${spec}`);
      }
    }
  });

  test("the E2E specs find things by role and name, not by CSS class or test id", () => {
    for (const file of sources("e2e")) {
      const text = readFileSync(file, "utf8");
      assert.ok(!/getByTestId|\.locator\(\s*["'`][.#]/.test(text), `${rel(file)} uses a test id or a class or id selector`);
    }
  });
});

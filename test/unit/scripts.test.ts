import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";

const run = (script: string, args: string[], env: Record<string, string> = {}) =>
  spawnSync("sh", [script, ...args], { encoding: "utf8", env: { ...process.env, ...env } });

describe("scripts/e2e.sh argument quoting", () => {
  // the printed string is what goes into the `sh -c` of the container: evaluating it must give the arguments back unchanged
  const roundTrip = (args: string[]): string[] => {
    const printed = run("scripts/e2e.sh", args, { E2E_PRINT_ARGS: "1" });
    assert.equal(printed.status, 0, printed.stderr);
    const back = spawnSync("sh", ["-c", `eval "set -- ${"$"}1"; for a in "${"$"}@"; do printf '%s\\0' "$a"; done`, "sh", printed.stdout], {
      encoding: "utf8",
    });
    return back.stdout.split("\0").slice(0, -1);
  };

  test("plain arguments survive", () => {
    assert.deepEqual(roundTrip(["--project=mobile", "--grep", "@menu-focus-return"]), ["--project=mobile", "--grep", "@menu-focus-return"]);
  });

  test("an argument with a single quote stays one argument and runs nothing", () => {
    const evil = "it's'; echo injected; '";
    assert.deepEqual(roundTrip([evil, "--x"]), [evil, "--x"]);
  });

  test("spaces and shell characters stay literal", () => {
    assert.deepEqual(roundTrip(["a b", "$HOME", "`id`", "x;y"]), ["a b", "$HOME", "`id`", "x;y"]);
  });
});

describe("scripts/check-commit-msg.sh", () => {
  const check = (message: string) => {
    const dir = mkdtempSync(join(tmpdir(), "msg-"));
    try {
      const file = join(dir, "MSG");
      writeFileSync(file, message);
      return run("scripts/check-commit-msg.sh", [file]).status;
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };

  test("accepts an ordinary message", () => {
    assert.equal(check("Add the seed\n\nIdempotent.\n"), 0);
  });

  test("refuses trailers and generation notes", () => {
    assert.equal(check("Add the seed\n\nCo-authored-by: A <a@example.com>\n"), 1);
    assert.equal(check("Add the seed\n\nSigned-off-by: A <a@example.com>\n"), 1);
    assert.equal(check("Add the seed\n\nGenerated with a tool\n"), 1);
  });

  test("ignores comment lines", () => {
    assert.equal(check("Add the seed\n# Co-authored-by: nobody\n"), 0);
  });
});

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { FAULTS } from "../../src/faults.ts";
import { judge, plan, summarise } from "../../scripts/negative-control-lib.ts";

describe("the plan", () => {
  test("has an entry for every fault and no entry for a fault that does not exist", () => {
    assert.deepEqual(Object.keys(plan).sort(), [...FAULTS].sort());
  });

  test("every entry names at least one behaviour", () => {
    for (const [fault, tags] of Object.entries(plan)) assert.ok(tags.length > 0, fault);
  });
});

const report = {
  suites: [
    {
      specs: [{ title: "a", ok: true, tags: ["titles"] }],
      suites: [
        {
          specs: [
            { title: "b", ok: false, tags: ["@header"] },
            { title: "c", ok: false, tags: ["header", "menu-open"] },
            { title: "d", ok: true },
          ],
        },
      ],
    },
  ],
};

describe("summarise", () => {
  test("counts every spec in nested suites and lists the failures with tags without the @", () => {
    const summary = summarise(report);
    assert.equal(summary.total, 4);
    assert.deepEqual(summary.failed, [
      { title: "b", tags: ["header"] },
      { title: "c", tags: ["header", "menu-open"] },
    ]);
  });

  test("an empty report has nothing in it", () => {
    assert.deepEqual(summarise({}), { total: 0, failed: [] });
  });
});

describe("judge", () => {
  test("accepts exactly the expected behaviours", () => {
    const verdict = judge(["header", "menu-open"], summarise(report));
    assert.equal(verdict.ok, true);
    assert.deepEqual(verdict.failingTags, ["header", "menu-open"]);
  });

  test("rejects a run where nothing failed", () => {
    const verdict = judge(["header"], { total: 3, failed: [] });
    assert.equal(verdict.ok, false);
    assert.match(verdict.message, /did not notice/);
  });

  test("rejects an expected behaviour that did not fail", () => {
    const verdict = judge(["header", "links"], summarise(report));
    assert.equal(verdict.ok, false);
    assert.match(verdict.message, /did not happen: links/);
  });

  test("rejects a failure in a behaviour that was not expected to fail", () => {
    const verdict = judge(["header"], summarise(report));
    assert.equal(verdict.ok, false);
    assert.match(verdict.message, /unrelated tests failed too: menu-open/);
  });

  test("rejects a failed test that carries no tag", () => {
    const verdict = judge(["header"], { total: 2, failed: [{ title: "naked", tags: [] }] });
    assert.equal(verdict.ok, false);
    assert.match(verdict.message, /without a tag: naked/);
  });
});

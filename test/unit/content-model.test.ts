import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { anchorFor, slugFromPathSegments } from "../../src/content/model.ts";

describe("anchorFor", () => {
  test("makes a lower case, hyphenated anchor", () => {
    assert.equal(anchorFor("How it works"), "how-it-works");
    assert.equal(anchorFor("  Recent results!  "), "recent-results");
    assert.equal(anchorFor("Café & Bar"), "cafe-bar");
  });
});

describe("slugFromPathSegments", () => {
  test("no segments is the homepage", () => {
    assert.equal(slugFromPathSegments(undefined), "/");
    assert.equal(slugFromPathSegments([]), "/");
  });

  test("joins segments into a slug", () => {
    assert.equal(slugFromPathSegments(["services", "audit"]), "/services/audit");
    assert.equal(slugFromPathSegments(["about"]), "/about");
  });

  test("anything that cannot be a slug is refused before it reaches the database", () => {
    for (const bad of [["About"], ["a b"], ["a", ""], [".."], ["a_b"], ["-a"], ["a-"], ["%00"], ["a;drop"]]) {
      assert.equal(slugFromPathSegments(bad), null, JSON.stringify(bad));
    }
  });
});

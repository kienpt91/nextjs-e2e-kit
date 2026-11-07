import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { describeFailures, internalPath, isFrameworkPath } from "../../e2e/support/links.ts";

const page = "http://127.0.0.1:3000/services/audit";

describe("internalPath", () => {
  test("resolves relative and absolute paths against the page", () => {
    assert.equal(internalPath("/pricing", page), "/pricing");
    assert.equal(internalPath("build", page), "/services/build");
    assert.equal(internalPath("../about", page), "/about");
    assert.equal(internalPath("http://127.0.0.1:3000/contact", page), "/contact");
  });

  test("keeps the query and drops the fragment", () => {
    assert.equal(internalPath("/pricing?plan=care#top", page), "/pricing?plan=care");
    assert.equal(internalPath("/#contact", page), "/");
  });

  test("does not follow the page itself by fragment, empty links, other origins or other schemes", () => {
    assert.equal(internalPath("#main", page), null);
    assert.equal(internalPath("", page), null);
    assert.equal(internalPath("   ", page), null);
    assert.equal(internalPath(null, page), null);
    assert.equal(internalPath(undefined, page), null);
    assert.equal(internalPath("https://example.com/", page), null);
    assert.equal(internalPath("http://127.0.0.1:3001/", page), null);
    assert.equal(internalPath("mailto:hello@example.com", page), null);
    assert.equal(internalPath("tel:+15555550100", page), null);
    assert.equal(internalPath("javascript:void(0)", page), null);
  });

  test("a page URL that cannot be parsed yields nothing instead of throwing", () => {
    assert.equal(internalPath("/about", "not a url"), null);
  });

  test("a protocol-relative link to another host is external", () => {
    assert.equal(internalPath("//example.com/about", page), null);
  });
});

describe("isFrameworkPath", () => {
  test("recognises framework assets and data requests", () => {
    assert.equal(isFrameworkPath("/_next/static/chunks/a.js"), true);
    assert.equal(isFrameworkPath("/pricing?_rsc=abc"), true);
    assert.equal(isFrameworkPath("/pricing"), false);
  });
});

describe("describeFailures", () => {
  test("lists only what is not the expected status, with where it was linked from", () => {
    const lines = describeFailures([
      { path: "/", status: 200, foundOn: "(start)" },
      { path: "/old", status: 404, foundOn: "/about" },
      { path: "/moved", status: 308, foundOn: "/" },
    ]);
    assert.deepEqual(lines, ["/old answered 404, linked from /about", "/moved answered 308, linked from /"]);
  });

  test("a different expected status can be asked for", () => {
    assert.deepEqual(describeFailures([{ path: "/x", status: 404, foundOn: "/" }], 404), []);
  });
});

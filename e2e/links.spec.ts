import { expect, test } from "@playwright/test";
import { crawlInternalLinks } from "./support/crawl.ts";
import { publishedPages, unpublishedPaths } from "./support/site-contract.ts";

test("every internal link on the site answers 200", { tag: "@links" }, async ({ page, request }) => {
  const report = await crawlInternalLinks({ page, request });
  expect(report.failures, report.failures.join("\n")).toEqual([]);

  // a crawl that reached nothing proves nothing: every published page must have been found by following links
  const found = report.results.map((r) => r.path);
  for (const { path } of publishedPages) {
    expect(found, `${path} is not reachable by following links from the homepage`).toContain(path);
  }
  // and an unpublished page must not be linked from anywhere
  for (const path of unpublishedPaths) expect(found).not.toContain(path);
});

test("paths that are asked to be ignored are not followed", { tag: "@links-options" }, async ({ page, request }) => {
  const report = await crawlInternalLinks({ page, request, ignore: [/^\/services\//] });
  const found = report.results.map((r) => r.path);
  expect(found).toContain("/about");
  expect(found.filter((path) => path.startsWith("/services/"))).toEqual([]);
});

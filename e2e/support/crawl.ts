import type { APIRequestContext, Page } from "@playwright/test";
import { describeFailures, internalPath, isFrameworkPath } from "./links.ts";
import type { LinkResult } from "./links.ts";

export interface CrawlReport {
  /** Every internal path found, with the status it answered. */
  results: LinkResult[];
  /** The paths that are HTML pages and were opened in the browser to read their links. */
  pagesRead: string[];
  /** Lines describing every link that did not answer 200. */
  failures: string[];
}

/**
 * Follows every internal link, starting at `start`, breadth first. Each distinct path is requested once and must answer `expectedStatus`
 * without a redirect; each HTML page that answers is opened in the browser and every link in it is collected, including links in
 * closed menus and inactive tab panels (they are in the document, so a visitor can reach them). It stops at `maxPages`, and a crawl that
 * hits the limit is reported as a failure, so a site that grows past it is noticed instead of silently half-checked. Paths matching
 * `ignore` are skipped.
 */
export async function crawlInternalLinks(options: {
  page: Page;
  request: APIRequestContext;
  start?: string;
  expectedStatus?: number;
  maxPages?: number;
  /** Paths that are not followed and not checked: an admin area, an API, a login page. Matched against the path and query. */
  ignore?: readonly RegExp[];
}): Promise<CrawlReport> {
  const { page, request, start = "/", expectedStatus = 200, maxPages = 200, ignore = [] } = options;
  const results: LinkResult[] = [];
  const pagesRead: string[] = [];
  const failures: string[] = [];
  const seen = new Set<string>([start]);
  const queue: { path: string; foundOn: string }[] = [{ path: start, foundOn: "(start)" }];

  while (queue.length > 0) {
    const next = queue.shift();
    if (next === undefined) break;
    if (results.length >= maxPages) {
      failures.push(`the crawl stopped at ${maxPages} paths; raise maxPages if the site really is that large`);
      break;
    }
    const response = await request.get(next.path, { maxRedirects: 0 });
    results.push({ path: next.path, status: response.status(), foundOn: next.foundOn });
    const isHtml = (response.headers()["content-type"] ?? "").includes("text/html");
    if (response.status() !== expectedStatus || !isHtml) continue;

    await page.goto(next.path);
    pagesRead.push(next.path);
    const hrefs = await page.getByRole("link", { includeHidden: true }).evaluateAll((links) => links.map((a) => a.getAttribute("href")));
    for (const href of hrefs) {
      const path = internalPath(href, page.url());
      if (path === null || isFrameworkPath(path) || ignore.some((pattern) => pattern.test(path)) || seen.has(path)) continue;
      seen.add(path);
      queue.push({ path, foundOn: next.path });
    }
  }
  failures.push(...describeFailures(results, expectedStatus));
  return { results, pagesRead, failures };
}

// Pure helpers of the link crawler (no browser), so they can be tested without one (test/unit/links.test.ts).

/**
 * The path (with the query, without the fragment) a link points to when it stays on the site, or null when the crawler must not
 * follow it: another origin, a scheme other than http(s) (mailto:, tel:, javascript:), a link to the same page with only a fragment,
 * or an empty href.
 */
export function internalPath(href: string | null | undefined, pageUrl: string): string | null {
  if (href === null || href === undefined) return null;
  const trimmed = href.trim();
  if (trimmed === "" || trimmed.startsWith("#")) return null;
  let target: URL;
  let page: URL;
  try {
    page = new URL(pageUrl);
    target = new URL(trimmed, page);
  } catch {
    return null;
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") return null;
  if (target.origin !== page.origin) return null;
  return `${target.pathname}${target.search}`;
}

export interface LinkResult {
  path: string;
  status: number;
  /** The page on which the link was first found ("(start)" for the page the crawl began at). */
  foundOn: string;
}

/** The results that are not a plain 200, as lines a person can act on. */
export function describeFailures(results: readonly LinkResult[], expectedStatus = 200): string[] {
  return results
    .filter((r) => r.status !== expectedStatus)
    .map((r) => `${r.path} answered ${r.status}, linked from ${r.foundOn}`);
}

/** Whether a path is one the crawler should skip: framework assets and data requests are not pages. */
export function isFrameworkPath(path: string): boolean {
  return path.startsWith("/_next/") || path.includes("_rsc=");
}

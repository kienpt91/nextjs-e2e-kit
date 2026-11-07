// The logic of the negative controls without any process handling, so it can be tested (test/unit/negative-control-lib.test.ts).
import type { Fault } from "../src/faults.ts";

/**
 * For each fault of the demo site, the behaviour tags (the @tags of the tests) that must fail, and no others. The list is exact on
 * purpose: a fault that makes an unrelated test fail means the tests are entangled; one that makes none fail means a test is not
 * checking what its name says.
 */
export const plan: Record<Fault, readonly string[]> = {
  "wrong-title": ["titles"],
  "section-order": ["home-sections"],
  "broken-link": ["links"],
  "soft-404": ["not-found"],
  "header-never-solid": ["header"],
  "menu-no-escape": ["menu-escape", "menu-focus-return"],
  "menu-no-focus-return": ["menu-focus-return"],
  "menu-no-focus-trap": ["menu-focus-trap"],
  "tabs-no-arrow-keys": ["tabs-keyboard"],
  "tabs-selection-not-exposed": ["tabs-aria"],
  "steps-clipped": ["steps"],
  "wide-element": ["no-overflow"],
  "contact-bar-not-fixed": ["contact-bar"],
  "contact-bar-covers-footer": ["contact-bar-clearance"],
  "reduced-motion-ignored": ["reduced-motion"],
};

interface JsonSpec {
  title: string;
  ok: boolean;
  tags?: string[];
}
interface JsonSuite {
  specs?: JsonSpec[];
  suites?: JsonSuite[];
}
export interface JsonReport {
  suites?: JsonSuite[];
}

export interface Summary {
  total: number;
  failed: { title: string; tags: string[] }[];
}

/** Reads a Playwright JSON report: how many tests there were and which failed, with their tags (without the "@"). */
export function summarise(report: JsonReport): Summary {
  const summary: Summary = { total: 0, failed: [] };
  const walk = (suite: JsonSuite) => {
    for (const spec of suite.specs ?? []) {
      summary.total += 1;
      if (!spec.ok) summary.failed.push({ title: spec.title, tags: (spec.tags ?? []).map((t) => t.replace(/^@/, "")) });
    }
    for (const child of suite.suites ?? []) walk(child);
  };
  for (const suite of report.suites ?? []) walk(suite);
  return summary;
}

export interface Verdict {
  ok: boolean;
  failingTags: string[];
  message: string;
}

/** Compares the tags that failed with the tags that had to fail. */
export function judge(expected: readonly string[], summary: Summary): Verdict {
  const failingTags = [...new Set(summary.failed.flatMap((f) => f.tags))].sort();
  const want = [...expected].sort();
  if (summary.failed.length === 0) {
    return { ok: false, failingTags, message: "no test failed: the suite did not notice the broken behaviour" };
  }
  const untagged = summary.failed.filter((f) => f.tags.length === 0).map((f) => f.title);
  if (untagged.length > 0) return { ok: false, failingTags, message: `failed tests without a tag: ${untagged.join("; ")}` };
  const missing = want.filter((t) => !failingTags.includes(t));
  const extra = failingTags.filter((t) => !want.includes(t));
  if (missing.length > 0) return { ok: false, failingTags, message: `expected failures that did not happen: ${missing.join(", ")}` };
  if (extra.length > 0) return { ok: false, failingTags, message: `unrelated tests failed too: ${extra.join(", ")}` };
  return { ok: true, failingTags, message: "only the intended tests failed" };
}

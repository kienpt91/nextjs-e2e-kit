# 0004. Negative controls: a fault switch in the demo site and an exact plan

Status: accepted

## Context

A green suite is a claim that the behaviour works. Without evidence that the tests can fail, the claim is empty, and some of the requested checks are easy to write vacuously (focus return that is automatic in the browser, a reduced-motion test on a page with no animation, a link crawler that visits one page).

## Decision

The demo site reads `DEMO_FAULT` and, when it names one of 15 faults (`src/faults.ts`), breaks exactly one behaviour: the title of the homepage, the order of the sections, a link to a page that does not exist, a "soft 404" that answers 200, a header that never turns solid, a menu that ignores Escape, that does not return focus, that lets focus leave, tabs that ignore arrow keys, tabs that do not expose the selection, step buttons clipped on a phone, an element that sticks out of the right edge, a contact bar that is not fixed, one that covers the last link, and motion that ignores the reduced-motion preference.

`scripts/negative-controls.sh` builds the site once and, for every fault, starts it, runs the whole suite and compares the tags (`@titles`, `@menu-focus-return`, ...) of the tests that failed with a plan (`scripts/negative-control-lib.ts`). The plan is exact. A fault that makes no test fail means a test does not check what it claims; a fault that fails an unrelated test means two behaviours are entangled in one test.

## Consequences

- The first run found three real problems: a motion test that assumed which section was last, a fault that broke the layout viewport of the whole phone page (so it failed the menu tests too, which is true of real phones and was replaced by an element that sticks out), and a fault that did nothing because the footer was tall enough to clear the contact bar by accident. All three were fixed in the demo site or the test, not in the plan.
- The fault code is in the demo site's source. It is small, isolated in one file and a few `fault === "..."` branches, and a project that adopts the suite deletes it; the controls can still be run in a project that keeps a staging copy of the site with its own switches.
- The controls take about five minutes, so they are a separate command and not part of every push; run them when the suite changes.

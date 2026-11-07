# nextjs-e2e-kit

A small, reusable end-to-end kit for a **Next.js site whose content lives in a database CMS**: a Playwright suite, CI definitions for **GitLab CI and GitHub Actions** with a **PostgreSQL service**, and a demo site that has the patterns the suite checks, so the suite is real and can be shown failing. It answers the questions a team asks before it trusts a site's front end to a pipeline:

1. **Does every page load, with the right title, sections in order, and a real 404?** Homepage status, title and section order; the title of every page; a crawler that follows every internal link and fails on anything but 200; a custom 404 that answers 404 (also for an unpublished page).
2. **Do the interactive parts work for keyboard and assistive technology?** A dialog menu that closes on Escape and gives focus back to its button, ARIA tabs that answer to Left, Right, Home and End, a header that is transparent over the hero and solid after scrolling, all found by role and accessible name, never by CSS class.
3. **Does it work on a phone?** 375 by 812 without sideways scroll on every page, step buttons that fit the screen and are big enough to touch, a bottom contact bar that stays on screen and does not cover the last link.
4. **Does it respect `prefers-reduced-motion`?** All content is visible without scrolling, with a control test that proves the animation exists without the preference.
5. **Can the tests fail?** 15 negative controls break the demo site one behaviour at a time, and the suite has to fail in exactly the tests that guard it.

It is an original, small, public reference. It has **not** been used in production, has **not** had an independent security review, and **no pipeline has been run on a GitLab runner or on GitHub Actions** (what was verified instead is below). The demo site is a fictional studio with invented content. [Payload CMS](https://payloadcms.com) is the kind of site it was written for; no Payload project was run here (`docs/adapting.md`).

## Demo output

`scripts/e2e.sh` starts a throwaway PostgreSQL container with no network, applies the migrations, seeds, builds the Next.js site, starts it and runs the suite, all in containers; nothing is installed on the host. This is real output (`docs/demo-output.txt`):

```
Running 50 tests using 2 workers

  ✓   1 [desktop] › contact-bar.spec.ts:4:1 › the quick contact bar is not shown on a desktop screen @contact-bar (332ms)
  ✓   2 [desktop] › header.spec.ts:9:3 › header on desktop › is transparent over the hero and solid after scrolling @header (1.9s)
  ✓   3 [desktop] › header.spec.ts:23:3 › header on desktop › stays at the top of the viewport while the page scrolls @header (226ms)
  ✓   4 [desktop] › header.spec.ts:29:3 › header on desktop › shows the links inline and no menu button @header (244ms)
  ✓   5 [desktop] › home.spec.ts:6:3 › homepage › answers 200 and shows one main heading @home (242ms)
  ✓   6 [desktop] › home.spec.ts:13:3 › homepage › shows its sections in reading order @home-sections (280ms)
  ✓   7 [desktop] › home.spec.ts:27:5 › page titles › / answers 200 with its own title @titles (311ms)
  ✓   8 [desktop] › home.spec.ts:27:5 › page titles › /about answers 200 with its own title @titles (259ms)
  ✓   9 [desktop] › home.spec.ts:27:5 › page titles › /pricing answers 200 with its own title @titles (182ms)
  ✓  10 [desktop] › home.spec.ts:27:5 › page titles › /contact answers 200 with its own title @titles (214ms)
  ✓  11 [desktop] › home.spec.ts:27:5 › page titles › /privacy answers 200 with its own title @titles (237ms)
  ✓  12 [desktop] › home.spec.ts:27:5 › page titles › /services/audit answers 200 with its own title @titles (252ms)
  ✓  13 [desktop] › home.spec.ts:27:5 › page titles › /services/build answers 200 with its own title @titles (246ms)
  ✓  14 [desktop] › home.spec.ts:27:5 › page titles › /services/care answers 200 with its own title @titles (232ms)
  ✓  15 [desktop] › links.spec.ts:5:1 › every internal link on the site answers 200 @links (946ms)
  ✓  16 [desktop] › links.spec.ts:18:1 › paths that are asked to be ignored are not followed @links-options (683ms)
  ✓  17 [desktop] › motion.spec.ts:6:1 › without the preference, sections below the fold fade in as they scroll into view @motion-control (1.8s)
  ✓  18 [desktop] › not-found.spec.ts:6:3 › custom 404 › an unknown address shows the custom page with status 404 @not-found (228ms)
  ✓  19 [desktop] › not-found.spec.ts:18:3 › custom 404 › a nested unknown address answers 404 too @not-found (10ms)
  ✓  20 [desktop] › not-found.spec.ts:24:3 › custom 404 › a page that exists but is not published answers 404 @not-found (9ms)
  ✓  21 [desktop] › not-found.spec.ts:31:3 › custom 404 › an address that cannot be a page is refused the same way @not-found (29ms)
  ✓  22 [desktop] › tabs.spec.ts:9:3 › services tabs › expose the tabs pattern to assistive technology @tabs-aria (243ms)
  ✓  23 [desktop] › tabs.spec.ts:31:3 › services tabs › move with Left and Right arrows, wrap around, and jump with Home and End @tabs-keyboard (243ms)
  ✓  24 [desktop] › tabs.spec.ts:61:3 › services tabs › leave the tab list with Tab and go to the panel's content @tabs-keyboard (176ms)
  ✓  25 [desktop] › tabs.spec.ts:69:3 › services tabs › show the content of the tab that is clicked @tabs-click (408ms)
  ✓  26 [mobile] › layout.mobile.spec.ts:8:1 › the phone project is 375 by 812 @viewport (65ms)
  ✓  27 [mobile] › layout.mobile.spec.ts:15:5 › no horizontal scroll at 375 px › /about @no-overflow (175ms)
  ✓  28 [mobile] › layout.mobile.spec.ts:15:5 › no horizontal scroll at 375 px › / @no-overflow (231ms)
  ✓  29 [mobile] › layout.mobile.spec.ts:15:5 › no horizontal scroll at 375 px › /pricing @no-overflow (190ms)
  ✓  30 [mobile] › layout.mobile.spec.ts:15:5 › no horizontal scroll at 375 px › /contact @no-overflow (199ms)
  ✓  31 [mobile] › layout.mobile.spec.ts:15:5 › no horizontal scroll at 375 px › /privacy @no-overflow (178ms)
  ✓  32 [mobile] › layout.mobile.spec.ts:15:5 › no horizontal scroll at 375 px › /services/audit @no-overflow (206ms)
  ✓  33 [mobile] › layout.mobile.spec.ts:15:5 › no horizontal scroll at 375 px › /services/build @no-overflow (203ms)
  ✓  34 [mobile] › layout.mobile.spec.ts:15:5 › no horizontal scroll at 375 px › /services/care @no-overflow (279ms)
  ✓  35 [mobile] › layout.mobile.spec.ts:27:3 › quick contact bar › is visible at the bottom of the screen on load @contact-bar (324ms)
  ✓  36 [mobile] › layout.mobile.spec.ts:37:3 › quick contact bar › stays on screen while the page scrolls, on every page @contact-bar (964ms)
  ✓  37 [mobile] › layout.mobile.spec.ts:45:3 › quick contact bar › offers a phone link, an e-mail link and the contact page @contact-bar (220ms)
  ✓  38 [mobile] › layout.mobile.spec.ts:52:3 › quick contact bar › does not cover the last link of the page @contact-bar-clearance (280ms)
  ✓  39 [mobile] › mobile-menu.mobile.spec.ts:16:3 › mobile menu › hides the inline links and opens a dialog from the Menu button @menu-open (341ms)
  ✓  40 [mobile] › mobile-menu.mobile.spec.ts:30:3 › mobile menu › closes with Escape @menu-escape (280ms)
  ✓  41 [mobile] › mobile-menu.mobile.spec.ts:37:3 › mobile menu › gives focus back to the Menu button after Escape @menu-focus-return (299ms)
  ✓  42 [mobile] › mobile-menu.mobile.spec.ts:44:3 › mobile menu › closes with the Close button and gives focus back to the Menu button @menu-focus-return (360ms)
  ✓  43 [mobile] › mobile-menu.mobile.spec.ts:52:3 › mobile menu › keeps keyboard focus inside while it is open @menu-focus-trap (336ms)
  ✓  44 [mobile] › mobile-menu.mobile.spec.ts:65:3 › mobile menu › following a link goes to the page and closes the menu @menu-open (370ms)
  ✓  45 [mobile] › steps.mobile.spec.ts:9:3 › step buttons on a phone › all fit in the width of the screen and are big enough to touch @steps (1.2s)
  ✓  46 [mobile] › steps.mobile.spec.ts:25:3 › step buttons on a phone › a tap on a step shows that step and marks it as the current one @steps (2.8s)
  ✓  47 [reduced-motion] › motion.reduced-motion.spec.ts:11:3 › prefers-reduced-motion: reduce › the browser really reports the preference @reduced-motion (284ms)
  ✓  48 [reduced-motion] › motion.reduced-motion.spec.ts:15:3 › prefers-reduced-motion: reduce › every section is fully visible without scrolling @reduced-motion (239ms)
  ✓  49 [reduced-motion] › motion.reduced-motion.spec.ts:26:3 › prefers-reduced-motion: reduce › nothing animates: transitions are off @reduced-motion (220ms)
  ✓  50 [reduced-motion] › motion.reduced-motion.spec.ts:32:3 › prefers-reduced-motion: reduce › the content is still there after scrolling to the end @reduced-motion (300ms)

50 passed (12.6s)
whole pipeline (database, migrate, seed, build, start, tests): 0m19.851s
```

`scripts/negative-controls.sh` breaks the site one behaviour at a time and checks which tests fail (`docs/negative-controls-output.txt`; the table of faults is `docs/negative-controls.md`):

```
baseline (no fault): 50 of 50 tests pass

fault                        tests failed  behaviours that failed                   result
wrong-title                  1 of 50       @titles                                  ok
section-order                1 of 50       @home-sections                           ok
broken-link                  1 of 50       @links                                   ok
soft-404                     4 of 50       @not-found                               ok
header-never-solid           1 of 50       @header                                  ok
menu-no-escape               2 of 50       @menu-escape @menu-focus-return          ok
menu-no-focus-return         2 of 50       @menu-focus-return                       ok
menu-no-focus-trap           1 of 50       @menu-focus-trap                         ok
tabs-no-arrow-keys           1 of 50       @tabs-keyboard                           ok
tabs-selection-not-exposed   1 of 50       @tabs-aria                               ok
steps-clipped                1 of 50       @steps                                   ok
wide-element                 1 of 50       @no-overflow                             ok
contact-bar-not-fixed        2 of 50       @contact-bar                             ok
contact-bar-covers-footer    1 of 50       @contact-bar-clearance                   ok
reduced-motion-ignored       1 of 50       @reduced-motion                          ok

every one of the 15 faults was caught by the tests that guard it, and only by those
```

When a test fails the report says what and where. This is the first lines of a real failure, with the menu fault `menu-no-focus-return`:

```
$ DEMO_FAULT=menu-no-focus-return npx playwright test --project=mobile --grep @menu-focus-return
  1) [mobile] › mobile-menu.mobile.spec.ts:37:3 › mobile menu › gives focus back to the Menu button after Escape @menu-focus-return

    Error: expect(locator).toBeFocused() failed

    Locator:  getByRole('button', { name: 'Menu', exact: true })
    Expected: focused
    Received: inactive
    Timeout:  5000ms

      39 |     await page.keyboard.press("Escape");
      40 |     await expect(menuDialog(page)).toBeHidden();
    > 41 |     await expect(menuButton(page)).toBeFocused();
         |                                    ^
```

## Run it

Everything runs in containers (Docker). The project is mounted read-only, `node_modules` lives in a Docker volume, the test containers have no network, drop every capability and run as your user.

```sh
scripts/node.sh install                 # npm ci --ignore-scripts into the volume (the only step with network access)
scripts/test.sh                         # typecheck, unit and integration tests with coverage, against a throwaway PostgreSQL
scripts/e2e.sh                          # migrate, seed, build, start, run the Playwright suite; report in out/playwright-report
scripts/e2e.sh --project=mobile         # arguments go to playwright test, for example --grep "@menu"
scripts/negative-controls.sh            # the 15 negative controls, about four minutes
scripts/gitlab-lint.sh                  # ask a real GitLab (a throwaway container) to lint .gitlab-ci.yml, about three minutes
open out/playwright-report/index.html   # the HTML report of the last run, on the host (traces: npx playwright show-trace FILE)
```

On the host without containers you need Node 24, PostgreSQL and the Playwright browsers (`npx playwright install chromium`); then `DATABASE_URL=... npm run db:migrate && npm run db:seed && npm run build && npx playwright test`. The container route is the one that was run here.

## CI

| File | What it does |
| --- | --- |
| `.gitlab-ci.yml` | stages `check` (typecheck and coverage with the PostgreSQL service, the CI definitions, the secret scan, the release scripts, the age of the dependencies) and `e2e` (wait for the database, migrate, seed, build, `playwright test`); the HTML report, traces and JUnit file are kept for a week when the job fails |
| `.github/workflows/ci.yml` | the same jobs, actions pinned to commit SHAs, read-only token, the report uploaded when the job fails |
| `.github/workflows/release.yml` | on a `v*` tag: the whole of `ci.yml`, then a source archive, `SHA256SUMS`, an attestation and the release (`RELEASING.md`) |

Both use the official Playwright image (Ubuntu 24.04, Node 24, Chromium) and PostgreSQL 16.14, each pinned by digest; a test fails when the files disagree, or when the image's version is not the exact version of `@playwright/test`. Details, runner differences and how to update a pin: `docs/ci.md`.

## Adapting it

`docs/adapting.md` is the guide: what to copy, how to point the suite at an existing site and its database, the one file to edit (`e2e/support/site-contract.ts`), which parts of the site the tests need (names for landmarks, a hydration flag), how to keep the tests alive when editors change copy, how the link crawler behaves on a real site, and what to do with the negative controls.

## How it fits together

```
e2e/                    the suite: specs (one file per behaviour), support/ (open, the link crawler, the contract of the site)
playwright.config.ts    three projects: desktop 1280x800, mobile 375x812 touch, reduced-motion; no retries; report to out/
src/content/            the content model and the repository port (pure) and its PostgreSQL implementation
src/db/                 pool, migration runner (checksums, advisory lock), idempotent seed, command line
src/ui/ src/app/        the demo site: server-rendered pages, the tabs, menu, header, reveal, stepper, contact bar, 404
src/faults.ts           the switches of the negative controls (demo site only)
migrations/             plain SQL
scripts/                container wrappers, the negative controls, the CI validator, the secret scan, the release scripts
test/                   unit, integration (PostgreSQL) and architecture tests of everything that is not the browser suite
docs/                   adapting guide, CI notes, negative controls, decision records
```

The decision records are in `docs/adr/`: roles and accessible names instead of selectors (0001), one pinned image everywhere (0002), waiting for hydration (0003), negative controls by fault switches (0004), no retries and reports on failure only (0005), database-backed content in the CI path (0006).

## What was verified, and how

All of it ran on this machine in containers (Docker on an arm64 Mac; the image is multi-architecture and the lock file holds the platform packages of x64, so a x64 runner installs the same versions).

| What | Result |
| --- | --- |
| Typecheck (`tsc --noEmit`, TypeScript 6.0.3, strict, `noUncheckedIndexedAccess`) | clean (`scripts/test.sh`) |
| Unit and integration tests (`node --test`), 21 suites | **76 tests pass** in 2.6 s: unit tests of the crawler helpers, the fault switch, the content model, the migration files, the negative-control logic and the CI rules; architecture rules; checks of both CI files; integration tests against a real PostgreSQL 16.14 for the migration runner (once, again, three runners at once, an edited migration, a failing one), the seed (repeated, repairing, rolling back), the schema constraints, the repository and the command line |
| Coverage of what those tests are meant to cover (`src/db`, `src/content` model and repository, `src/faults.ts`, the E2E helpers, the negative-control logic) | **lines 100 %, branches 96.55 %, functions 97.50 %**; thresholds 90 / 80 / 90 fail the run. The React components, the routes and the Playwright specs are not in this number: line coverage of a page says nothing about whether a person can use it, and the browser suite is judged by the negative controls instead |
| Browser suite (`scripts/e2e.sh`), Chromium, 2 workers | **50 tests pass in 12.6 s** (25 desktop, 21 phone at 375 x 812, 4 reduced-motion); the whole pipeline in the container (database up, migrate, seed, build, start, tests) takes 19.9 s |
| Stability: the same suite five times in a row (`--repeat-each=5`) | 250 of 250 pass in 55 s; no retries are configured |
| Negative controls (`scripts/negative-controls.sh`) | **15 of 15 faults caught by exactly the tests that guard them**, baseline 50 of 50 green, 3 min 57 s; the first run found three problems in the tests and the demo, listed in `docs/negative-controls.md` |
| CI definitions (`npm run lint:ci`) | `.gitlab-ci.yml`, `ci.yml` and `release.yml` validate against GitLab's `ci.json` and SchemaStore's `github-workflow.json` (pinned by commit and hash) and against the repository rules; a file with a misspelled `script:` key, an unknown stage, an unpinned image and a mutable action is rejected with 18 findings (`docs/lint-ci-rejects-invalid-output.txt`, samples in `test/fixtures`) |
| A real GitLab (`scripts/gitlab-lint.sh`: a throwaway GitLab CE 19.5.3 container with no network, the file committed to a project, GitLab's own linter) | `.gitlab-ci.yml`: **valid**, both as a parse and as a dry run of the pipeline for the default branch, 6 jobs. The invalid sample is rejected ("jobs e2e config should implement the script:, run:, or trigger: keyword"). Transcript: `docs/gitlab-lint-output.txt` |
| A fresh `git clone` (`scripts/node.sh install`, `scripts/test.sh`, `scripts/e2e.sh`) | 76 tests and 50 browser tests pass; the first attempt found two problems that a working copy hides (the mount point of `node_modules` and `next-env.d.ts` in a read-only mount), both fixed |
| Dependencies (`node ../_tools/check-age.mjs .`, 7 days) | 84 locked packages, none too new |
| Secret scan (`scripts/secret-scan.sh --staged`, on every commit) | clean |

The GitHub workflows were validated against the schema and the repository rules; no GitHub-side linter was run, and nothing was run on GitHub.

## What is not verified

- **No pipeline has been run** on GitLab runners or on GitHub Actions. The GitLab file was parsed and dry-run by a real GitLab CE (a throwaway container), both files validate against the vendors' schemas, and the commands are the ones that ran here; but an executor, a proxy, a runner without Docker socket access or a slow image pull can still surprise you (`docs/ci.md`).
- **Only Chromium** was run. Firefox and WebKit are in the image and `docs/adapting.md` says how to add them.
- **The suite was never run against a Payload CMS site** or any other site than the demo. The guide is written from how those sites are built.
- **The release workflow has not run on GitHub.** The scripts it calls are tested.
- The ARIA checks cover the patterns they name; they are not an accessibility audit. Passing them says nothing about screen reader behaviour or colour contrast.
- Timings are from one laptop with 2 workers; a CI runner with 2 vCPUs will be slower, mostly in the image pull and the build.

## Dependencies

Runtime: `next`, `react`, `react-dom`, `pg`. Development: `@playwright/test`, `typescript`, the type packages, `yaml` and `ajv` (for the CI validator). Exact versions, a committed lock file (84 locked packages), every package at least seven days old when pinned (`node scripts/check-dep-age.mjs`), installs without lifecycle scripts, containers and actions pinned by digest or commit SHA. Dependabot proposes updates weekly with a seven day cooldown. See `SECURITY.md`.

## Licence

MIT, see `LICENSE`.

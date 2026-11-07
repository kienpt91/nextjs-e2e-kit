# Security

## Reporting a vulnerability

Use GitHub's private vulnerability reporting for this repository. Do not open a public issue for a vulnerability. This is a personal open-source reference project maintained on a best-effort basis: no service level and no bounty. It has not been used in production and has not had an independent security review.

## What this is

A Playwright end-to-end suite and CI definitions (GitLab CI and GitHub Actions) that are meant to be copied next to a Next.js site that keeps its content in PostgreSQL (a CMS such as Payload does). The repository also contains a small demonstration site so the suite has something real to run against. The site is not a product and is not meant to be deployed.

What can go wrong with a kit like this, and what answers it:

1. the suite or its CI leaks a secret or runs untrusted code with privileges,
2. a test passes while the behaviour is broken (a false green),
3. the CI definition drifts into something unpinned or over-privileged,
4. the failure artifacts expose data of the site under test.

## Threat model

Every claim names a test or a script that fails if the claim stops being true. Paths are relative to the repository root.

| Threat | What the repository does | Check |
| --- | --- | --- |
| A test passes while the behaviour is broken | Every behaviour has a negative control: the demo site can be started with that behaviour broken (`DEMO_FAULT`), and the whole suite must fail in exactly the tests that guard it | `npm run negative-controls` (`scripts/negative-controls.sh`, 15 faults, the result is in `docs/negative-controls.md`); `test/unit/negative-control-lib.test.ts` (the plan covers every fault; a run where nothing fails, or an unrelated test fails, is rejected) |
| A test is vacuous (a reduced-motion test on a site with no animation) | A control test proves the animation exists without the preference | `e2e/motion.spec.ts` (`@motion-control`) |
| The crawler "checks every link" but reached nothing | The link test fails unless every published page was found by following links, and a crawl that hits its page limit is a failure | `e2e/links.spec.ts` |
| A typo in `DEMO_FAULT` runs the healthy site and the controls look green | An unknown fault name is an error that lists the valid names | `test/unit/faults.test.ts` |
| The demo's fault switch is left on in a real deployment | It is only read from the environment variable `DEMO_FAULT`, nothing sets it by default, and `docs/adapting.md` says to delete `src/faults.ts` with the demo site | `.env.example` states it; not enforced by a test: if you deploy the demo site, do not set the variable |
| SQL injection through a page address | Every statement uses bind parameters; an address that cannot be a slug is refused before any query | `test/integration/database.test.ts` ("treats a hostile slug as data"), `test/unit/content-model.test.ts`, `e2e/not-found.spec.ts` |
| An edited migration silently diverges from the database | Migrations are recorded with a SHA-256 and a changed one stops the run; a lock makes two runners take turns; a failing migration rolls back whole | `test/integration/database.test.ts` ("migrations") |
| A secret reaches the repository | Secret scanner on commit, push and in CI (tree and history); `.gitignore` covers key files, `.env` and Playwright's saved sessions | `scripts/secret-scan.sh`; CI job `secret-scan` |
| A CI image or action is replaced upstream | Images (the Playwright image, PostgreSQL) are pinned by digest, actions by full commit SHA; a test reads both CI files and the container scripts and compares them | `test/unit/ci-definitions.test.ts`, `scripts/lint-ci.ts` (rules) |
| The workflow token can write | Top-level `permissions: contents: read`; `pull_request_target` is refused by the validator; checkout does not keep the token; only the release job has write permissions, and only `GITHUB_TOKEN` is used | `scripts/lint-ci-lib.ts`, `test/unit/lint-ci-lib.test.ts` |
| The browser library and the browsers it drives disagree | The version in the image tag must equal the exact version of `@playwright/test` | `test/unit/ci-definitions.test.ts` |
| A dependency is compromised or brand new | Exact pins, every locked package at least 7 days old at the pin, installs without lifecycle scripts, no runtime dependency except `next`, `react`, `react-dom`, `pg` | `scripts/check-dep-age.mjs`; CI job `dependency-age` |
| The suite grows a dependency on the site's internals | The E2E code may not import from `src/`; specs find elements by role and name, not by class, id or test id | `test/unit/architecture.test.ts` |
| The failure artifacts expose data | They are kept only when the job fails and for one week; the demo database holds invented content only | `.gitlab-ci.yml` (`when: on_failure`, `expire_in`), `.github/workflows/ci.yml` (`retention-days: 7`) |
| The local toolchain touches the host | Builds and tests run in a container with no network (after the install), a read-only root and project mount, no capabilities, the calling user, and a database container with no network at all | `scripts/node.sh`, `scripts/with-postgres.sh` |

## What is not guaranteed

- **No real pipeline has been run.** The GitLab CI and GitHub Actions definitions are validated against the vendors' JSON schemas and against rules of our own, the same commands are what the containers run locally, and `docs/ci.md` lists exactly which verification was done. A run on GitLab runners or on GitHub Actions has not been done by the author of this repository; expect to adjust runner tags, executors and proxy settings.
- **Chromium runs without its own sandbox.** Playwright starts it with `--no-sandbox` unless told otherwise, and in the container the container is the boundary (no capabilities, an unprivileged user, no network for local runs). On a shared CI runner treat the job like any job that opens a browser on content you did not write: run the suite against your own site, not against pages from third parties.
- **Failure artifacts contain what the browser saw.** Traces include network responses, screenshots and the DOM. If you adapt the suite to a site that has real customer data or logged-in sessions, assume the artifacts do too: shorten the retention, restrict who can download them, and never run against production with a real account. Saved sessions (`storageState`) are credentials; the ignore list covers `playwright/.auth/`, keep them out of git.
- **The PostgreSQL service trusts every connection** (`POSTGRES_HOST_AUTH_METHOD=trust`). That is acceptable only because the service is reachable from its own job and nothing else; never reuse this setting for a database that another host can reach.
- **The demo site is not hardened.** It sets no security headers and is not meant to be exposed.
- **Tests find regressions, not vulnerabilities.** The suite says nothing about whether a site is secure, accessible to every user, or fast. The ARIA checks cover the patterns they name (tabs, a modal dialog, focus return); they do not replace an audit with assistive technology.
- **Browsers.** Only Chromium is run. The image also contains Firefox and WebKit, and `docs/adapting.md` says how to add them, but they were not run here.
- **Payload CMS** is not part of this repository and was not run. The guide is written from how such a site is structured, not from a Payload project that was tested.

## Dependency policy

- Exact versions in `package.json`, a committed `package-lock.json`, every package resolved with `npm install --before=2026-10-31T00:00:00Z --ignore-scripts --save-exact` (84 locked packages, none newer than the cutoff). CI uses `npm ci --ignore-scripts`; the browsers come from the pinned image, so no dependency needs an install script. Dependabot (npm and github-actions, weekly, 7-day cooldown) ignores major bumps of `typescript` and `@types/node`.
- Container images are pinned by digest: the Playwright image `v1.64.0-noble` (built 2026-10-08, picked over the `v1.64.1` rebuild of 2026-11-01 because that one was younger than seven days when pinned) and PostgreSQL 16.14 (built 2026-08-05). GitHub Actions are pinned to full commit SHAs; the release job gets `contents: write`, `id-token: write` and `attestations: write` and uses only `GITHUB_TOKEN`.
- The two JSON schemas the validator uses are downloaded from a pinned commit and checked by SHA-256 before use (`scripts/lint-ci.ts`).

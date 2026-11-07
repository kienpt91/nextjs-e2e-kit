# Adapting the suite to an existing Next.js site with a CMS

The repository has two halves: the **suite** (`e2e/`, `playwright.config.ts`, the CI files, `scripts/with-postgres.sh` and friends) and a **demo site** (`src/`, `migrations/`) that exists so the suite has something real to run against. You keep the first and throw the second away. The suite never imports the site's code (`test/unit/architecture.test.ts` enforces it), so nothing in `e2e/` depends on the demo.

Payload CMS (Next.js plus PostgreSQL) is the case this was written with in mind, but no Payload project was run here. Everything below is about how such a site is built; check each step against your project.

## 1. What to copy

| Copy | Why |
| --- | --- |
| `e2e/`, `playwright.config.ts` | the suite |
| `.gitlab-ci.yml` and/or `.github/workflows/ci.yml` | the pipeline; merge the jobs into yours if you have one |
| `scripts/lint-ci*.ts`, `scripts/secret-scan.sh`, `lefthook.yml` | optional checks |
| `scripts/node.sh`, `scripts/with-postgres.sh`, `scripts/e2e.sh` | to run the pipeline locally in containers |
| the dev dependencies `@playwright/test` (exact version of the image tag) and `typescript` | |

Do not copy `src/`, `migrations/`, `src/faults.ts`, `scripts/negative-control*`, `docs/negative-controls.md`, or the seed. If your site can run in a throwaway environment that you can break on purpose, read section 8 before you drop the negative controls.

## 2. Point the suite at your site

`playwright.config.ts` has two modes.

- **The suite starts the site** (default): `webServer.command` is `npm run start`. Replace it with what starts your built site (`next start`, `node .next/standalone/server.js`). It must be a production build: a dev server compiles on the first request and its timings, hydration and layout differ.
- **The site is somewhere else**: set `E2E_BASE_URL=https://staging.example.com` and nothing is started. Do not point it at production with an account that can change things, and do not point it at a site that has third-party widgets you do not own without reading section 6.

The pipeline needs the same database state every run, because the suite asserts structure that comes from it:

1. start PostgreSQL (the CI service containers do this; `scripts/with-postgres.sh` does it locally),
2. run your CMS's migrations (for Payload: `payload migrate`),
3. load a fixed seed (your own script, or an SQL dump; **not** a copy of production),
4. build and start the site against it.

Those are the four lines between `db:wait` and `playwright test` in `.gitlab-ci.yml`. In the kit they are `npm run db:migrate && npm run db:seed && npm run build`.

GitLab note: with the Docker executor the service is at the host name `postgres`. With the **Kubernetes** executor a service shares the pod's network, so use `localhost` in `DATABASE_URL`. This is from GitLab's documentation of executors and was not tried here.

## 3. Make the site testable the way users use it

The suite finds everything by role and accessible name (docs/adr/0001). Before you write a test for a component, check what the browser's accessibility tree says about it: Playwright's `page.getByRole('button', { name: 'Menu' })`, or `npx playwright codegen URL`, which suggests locators by role. If the element has no name, **fix the component**, not the test: an icon button without `aria-label`, a link that says "Click here", a `div` with an `onClick`. Those are real defects for a screen reader user, and the test now finds them.

Three things the suite needs from the site, each small:

1. **A hydration flag** (`src/ui/hydration-flag.tsx`, docs/adr/0003): an effect in the root layout sets `data-hydrated="true"` on `<html>`. If you cannot add it, change `open()` in `e2e/support/app.ts` to wait for something that is only there once the page is interactive.
2. **Accessible names** on landmarks the tests use: `banner` (the `<header>`), `main`, `contentinfo` (the `<footer>`), `navigation` with a label ("Main", "Footer"), the dialog (`role="dialog"` with `aria-label`), the tablist, a group around step buttons, a `complementary` landmark with a name for the contact bar.
3. **Real content in CI**: a seed that gives the homepage its sections, at least one unpublished page, and at least three tabs.

## 4. Edit one file: `e2e/support/site-contract.ts`

It holds what the suite expects of the content and nothing else:

```ts
export const publishedPages = [{ path: "/", title: /Acme/ }, { path: "/about", title: /^About\b/ }, /* ... */];
export const unpublishedPaths = ["/drafts/spring-offer"];
export const homeSections = [/services/i, /how it works/i, /results/i, /contact/i];
export const mainNavigation = [/about/i, /pricing/i, /contact/i];
```

Then walk the specs and answer the questions in this table. Each row is a test file; the tag is what the negative controls use.

| Behaviour | File and tag | Adapt by |
| --- | --- | --- |
| homepage 200, title, sections in order | `home.spec.ts` `@home` `@titles` `@home-sections` | the contract file; if your homepage has no h1 hero, change the first test |
| every internal link answers 200 | `links.spec.ts` `@links`, `support/crawl.ts` | `ignore: [/^\/admin/, /^\/api\//]` for areas that are not pages; see section 6 |
| custom 404 with status 404 | `not-found.spec.ts` `@not-found` | the heading name; Next.js: `not-found.tsx` and `notFound()`, a page that answers 200 with a "not found" message is a soft 404 and the test fails |
| header transparent over the hero, solid after scrolling | `header.spec.ts` `@header` | the two colours (they are computed styles: `rgba(0, 0, 0, 0)` and `rgb(255, 255, 255)`); read them from your design tokens |
| mobile menu dialog, Escape, focus return | `mobile-menu.mobile.spec.ts` `@menu-*` | the button and dialog names (`Menu`, `Main menu`); Radix, Headless UI and a native `<dialog>` expose the same roles |
| ARIA tabs with Left and Right | `tabs.spec.ts` `@tabs-*` | the tablist name; the count of tabs is asserted as 3: if an editor can add tabs, assert `toBeGreaterThan(1)` |
| step buttons on a phone | `steps.mobile.spec.ts` `@steps` | what "step buttons" are in your site: a wizard, a stepper, a pager. The checks are that each fits the screen, is at least 44 CSS pixels, and that a tap changes the current step |
| 375 by 812 without sideways scroll | `layout.mobile.spec.ts` `@no-overflow` | loops over the contract's pages; add the templates that are not in the sitemap (a blog post, a product) |
| a bottom bar visible on a phone | `layout.mobile.spec.ts` `@contact-bar` | the landmark name; whether the bar is fixed or sticky, the assertions are about being in the viewport and not covering the last link |
| reduced motion shows all content | `motion.reduced-motion.spec.ts` `@reduced-motion`, control in `motion.spec.ts` | what your site animates: it checks opacity, transform and transition duration of the sections |

## 5. Keeping the suite resilient to editor copy changes

The people who edit a CMS site change words, add sections and reorder blocks. A suite that asserts the words fails on the first edit and is turned off by the second. Rules the kit follows, and that are worth keeping:

- **Assert structure, not prose.** "There are three level-two headings in this order" survives a rewrite of the headings; "the heading says *Our Services*" does not. The kit asserts regions and headings with patterns (`/services/i`), never body text.
- **Match a key word.** `/services/i` passes for "Services", "Our services" and "SERVICES". `exact: true` is only for short names that are a prefix of another name ("Menu" and "Close menu").
- **Compare content with itself, not with a constant.** The tab test does not know what the second panel says. It checks that the panel is named after the tab that was selected (`toHaveAccessibleName(await tab.innerText())`) and that clicking another tab changes the text (`not.toHaveText(before)`).
- **Do not assert counts an editor controls.** The kit asserts the count of tabs and steps because the seed fixes them. If the editor can add one, assert a lower bound.
- **Test titles by pattern.** `/^About\b/`, not `"About | Lantern Studio"`; a change of the site name suffix then touches no test.
- **Run against a seeded database, not against the live content** whenever you can. Then the content only changes when you change the seed, and a test failure means the code changed. If you must test live content (a staging copy that editors use), keep the contract file loose and assert only layout and behaviour.
- **Keep one place for expectations.** When a page is added or a heading renamed, `site-contract.ts` is the only edit. The test names include the path so a failure points to the page.
- **Never wait with a timeout.** `waitForTimeout` is a bug; use an assertion that retries (`expect(locator).toHaveCSS(...)`) or `open()`.
- **Reach for `toPass` last.** `await expect(async () => { ... }).toPass()` retries a block; it is for things that have no single retrying assertion, and it hides races if overused.

When an element is truly unnamed and cannot be fixed (a third-party widget), use `page.getByTestId` and set `testIdAttribute` in `playwright.config.ts`, and relax the architecture test for that file only. A comment saying why is worth more than the exception.

## 6. The link crawler on a real site

`crawlInternalLinks` opens each HTML page in the browser, collects every `<a href>` (including ones in closed menus and hidden tab panels), and requests every distinct internal path without following redirects. On a real site:

- **Redirects are failures by default** (the request has `maxRedirects: 0` and expects 200), so `/old` that redirects to `/new` is reported, with the page that links to it. That is deliberate: an internal link that redirects is a link to fix. If you want to allow them, change `expectedStatus` or follow redirects.
- **Admin areas and APIs** are not pages: pass `ignore` (`/^\/admin/`, `/^\/api\//`).
- **Limits**: the crawl stops at 200 paths and fails when it hits the limit. Raise `maxPages`, or crawl from a list of start paths (the sitemap) instead of the homepage.
- **External links** are not checked: they belong to someone else and make the suite flaky. A separate, non-blocking job that checks them is the usual answer.
- **Locales**: crawl each locale's homepage; `start` is a parameter.
- **Query strings**: `/products?page=2` is a different path from `/products`. A site with a filter that links to thousands of combinations needs `ignore` for the query.

## 7. The CI files

Both definitions run the same steps in the same order; `test/unit/ci-definitions.test.ts` checks it. Replace the `npm run db:*` and `npm run build` lines with yours, set `DATABASE_URL`, keep the image pin and the service pin (update by digest, see docs/ci.md), and keep the artifact block (`when: on_failure`, `out/playwright-report/`, `out/test-results/`). If your tests write elsewhere, change `outputDir` and the html reporter folder in `playwright.config.ts` and the artifact paths together.

For a monorepo, `cd` into the package that has the config before the first script line, and use GitLab's `rules: changes:` (or GitHub's `paths:`) to skip the job when the site did not change.

## 8. What to do with the negative controls

The faults only make sense where you can break the site on purpose. Three honest options:

1. **Keep them**: add your own fault switches to a staging build for the behaviours you care about most (focus return, the 404 status, the order of sections) and extend `plan` in `scripts/negative-control-lib.ts`. This is what protects the suite from going green while the behaviour is broken.
2. **Do it by hand once**: break the behaviour on a branch (comment out the `focus()` call), run the suite, see the named test fail, and revert. Put the one-line result in the pull request.
3. **Skip them** and accept that a test that cannot fail is possible. If you choose this, review the tests for vacuity: a test that only asserts `toBeVisible` on something that is always visible, a test that passes with the animation removed.

## 9. More browsers, more viewports, authenticated pages

- **Firefox and WebKit** are in the Playwright image. Add a project with `browserName: "firefox"` and run only the specs that are not about Chromium behaviour. They were not run here.
- **Another phone size**: copy the `mobile` project; the tests read the size from `page.viewportSize()`, except the guard in `layout.mobile.spec.ts` that asserts 375 by 812, which you would edit.
- **A logged-in area**: log in once in a setup project and save `storageState` to `playwright/.auth/` (git-ignored; it is a credential); see the Playwright documentation on authentication. Use a test account with the least permissions, on a staging site, and read SECURITY.md about artifacts.

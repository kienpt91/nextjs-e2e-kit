# Changelog

## 0.1.0

First release.

- Demo site (Next.js 16, React 19, PostgreSQL): pages, sections and items read from tables on every request; WAI-ARIA tabs with arrow keys, Home and End; a modal dialog menu with focus trap, Escape and focus return; a header that is transparent over the hero and solid after scrolling; sections that fade in unless the visitor prefers reduced motion; step buttons laid out for a phone; a bottom quick-contact bar; a custom 404 that answers 404, also for unpublished pages.
- Playwright suite (50 tests): homepage status, title and section order; titles of every page; a link crawler that checks every internal link; the 404; header; tabs; mobile menu; step buttons; no horizontal scroll at 375 by 812 on every page; the contact bar; reduced motion with a control. Three projects (desktop, phone, reduced motion), selectors by role and accessible name, a wait for hydration, no retries.
- Negative controls: 15 faults of the demo site, each of which must fail exactly the tests that guard the behaviour.
- CI: `.gitlab-ci.yml` (Playwright image and PostgreSQL service pinned by digest, migrate, seed, build, test, report kept when the job fails) and GitHub Actions (SHA-pinned, read-only token), plus jobs for the secret scan, the age of the dependencies, the CI definitions and the release scripts; a validator for both against the vendors' schemas.
- Container scripts: `scripts/e2e.sh`, `scripts/test.sh`, `scripts/negative-controls.sh`, `scripts/with-postgres.sh`.
- Unit and integration tests (76) with coverage thresholds; architecture rules; checks of the CI definitions.

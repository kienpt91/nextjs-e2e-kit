# 0002. One pinned image for local runs, GitLab and GitHub

Status: accepted

## Context

"Works on my machine" is the usual failure of a browser suite: the browser version, the fonts and the operating system differ between a laptop, a GitLab runner and a GitHub runner, and screenshots, layout measurements and timings follow. Browsers also have to match the library: Playwright 1.64.0 drives the Chromium build that ships in the 1.64.0 image.

## Decision

The official Playwright image (Ubuntu 24.04, Node 24, Chromium) is used by `scripts/node.sh` locally, by `.gitlab-ci.yml` as the job image and by `.github/workflows/ci.yml` as the job container. It is pinned by digest, and `test/unit/ci-definitions.test.ts` fails when the digests of the four files differ, or when the version in the image tag differs from the exact version of `@playwright/test` in `package.json` and in the lock file. PostgreSQL is pinned the same way.

The tag `v1.64.1-noble` was rebuilt on 2026-11-01, six days before it would have been pinned, which breaks the seven day policy for images. The kit pins `v1.64.0-noble` (built 2026-10-08) with `@playwright/test` 1.64.0 instead.

## Consequences

- A test that fails in CI fails the same way locally: `scripts/e2e.sh` is the CI job in containers.
- Updating Playwright is one change in four places and the test tells you which one you forgot.
- The image is large (about 2 GB). The cost is paid once per runner; caching the image on a self-hosted runner is the usual remedy.
- The image runs as root by default. The local script runs it as the calling user with all capabilities dropped; the CI definitions run it as the runner does, which is root inside a throwaway container.

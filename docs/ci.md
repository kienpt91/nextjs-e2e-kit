# CI: GitLab CI and GitHub Actions

Both definitions do the same thing in the same order, with the same two images, and a test (`test/unit/ci-definitions.test.ts`) fails when they stop doing so.

## The steps

1. **check** stage: typecheck; unit and integration tests with coverage thresholds (the integration tests use the PostgreSQL service); the CI definitions are validated (`npm run lint:ci`); the secret scan (tree and history); the shell tests of the release scripts; the age of the locked dependencies.
2. **e2e** stage: wait for the database (`npm run db:wait`), apply the migrations (`db:migrate`), seed (`db:seed`), build the site (`npm run build`), run the suite (`npx playwright test`; `playwright.config.ts` starts `npm run start` and waits for the URL).
3. When the e2e job fails, the HTML report, the traces and screenshots (`out/playwright-report/`, `out/test-results/`) are kept for a week (GitLab: `artifacts: when: on_failure`, `expire_in: 1 week`, plus the JUnit file as a test report; GitHub: `upload-artifact` with `if: failure()`, `retention-days: 7`). A green run keeps nothing.

## GitLab CI (`.gitlab-ci.yml`)

- **Image**: `mcr.microsoft.com/playwright@sha256:06a9939e…` (tag `v1.64.0-noble`: Ubuntu 24.04, Node 24, Chromium), set once under `default:`.
- **Service**: `postgres@sha256:95206741…` (16.14) with the alias `postgres`, so `DATABASE_URL` is `postgres://postgres@postgres:5432/postgres`. The service gets `POSTGRES_HOST_AUTH_METHOD=trust` from the pipeline variables; the database holds only the seed and is gone with the job. The `.postgres` hidden job holds the service so that both jobs that need it share one definition.
- **Rules**: merge request pipelines, the default branch and tags.
- **Cache**: the npm cache, keyed on `package-lock.json`. `npm ci --ignore-scripts` never runs a package's install script.
- **Timeout**: 20 minutes for the e2e job.

### If your runner differs

- **Docker executor** (the common one): the service is reachable at the host name `postgres`, as in the file.
- **Kubernetes executor**: as GitLab documents, services run in the same pod and are reachable on `localhost`; set `DATABASE_URL` to `postgres://postgres@localhost:5432/postgres`. Not tried here.
- **Chromium crashes with "Target closed" or out of memory in `/dev/shm`**: a Docker executor runner gives 64 MB of shared memory by default. Playwright starts Chromium with `--disable-dev-shm-usage`, which is why this kit does not need to change it, but if you add Firefox or WebKit set `shm_size` for the runner.
- **A runner behind a proxy** needs `HTTP_PROXY`/`HTTPS_PROXY` for `npm ci` and the dependency-age job; the tests themselves talk only to localhost.
- **Runner tags**: the file sets none. Add `tags:` under `default:` if your runners are tagged.

## GitHub Actions (`.github/workflows/ci.yml`)

- Actions are pinned to full commit SHAs; the top-level `permissions` is `contents: read`; `actions/checkout` has `persist-credentials: false`.
- The browser jobs run in `container:` with the same Playwright image; the PostgreSQL service is reached at the host name `postgres`.
- `release.yml` reuses this file (`workflow_call`) and adds the archive, the checksums, an attestation and the release; see `RELEASING.md`.

## Updating a pin

- **Playwright**: change `@playwright/test` (exact), the tag comment and the digest in `.gitlab-ci.yml`, `.github/workflows/ci.yml` and `scripts/node.sh` together, then `npm ci` and run `scripts/e2e.sh`. `npm run test` fails if the four disagree or if the tag's version differs from the package. Prefer an image that is older than seven days; look up its digest and creation date in the registry (`https://mcr.microsoft.com/v2/playwright/manifests/<tag>`).
- **PostgreSQL**: change the digest in the three places (`.gitlab-ci.yml`, `ci.yml`, `scripts/with-postgres.sh`) and the comment.
- **An action**: `git ls-remote https://github.com/OWNER/REPO TAG` gives the commit; pin that, keep the version in a comment. Dependabot opens these updates weekly with a seven day cooldown.

## What was verified, and what was not

See the README ("What was verified, and how") for the numbers. In short:

- Both files parse and validate against the vendors' JSON schemas (GitLab's `ci.json` and SchemaStore's `github-workflow.json`, pinned by commit and hash) and against rules of our own; deliberately broken files are rejected (`npm run lint:ci -- --gitlab test/fixtures/invalid-gitlab-ci.yml --workflows test/fixtures/invalid-workflows`, output in `docs/lint-ci-rejects-invalid-output.txt`).
- The commands the CI jobs run are the commands `scripts/e2e.sh` and `scripts/test.sh` run in containers on this machine.
- A real GitLab (a throwaway GitLab CE 19.5.3 container, `scripts/gitlab-lint.sh`) was asked to lint `.gitlab-ci.yml`, as a parse and as a dry run of the pipeline for the default branch: valid, 6 jobs (`docs/gitlab-lint-output.txt`). Its own rejection of the invalid sample is in the same file.
- **No pipeline has run** on GitLab runners or on GitHub Actions. Things only a real run shows: whether your runner can pull the images, whether the service starts in time (`db:wait` waits up to 60 seconds), the executor's networking, the time the Playwright image takes to pull, and permission settings of the repository.

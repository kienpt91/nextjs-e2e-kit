# 0005. No retries; the report is kept only when the job fails

Status: accepted

## Context

Retries turn a flaky test into a green build. A test that fails once in twenty runs against a site with no randomness has a race, either in the test or in the site, and the person who sees the failure once is the only one who will ever know. Meanwhile CI needs to give the author of a failing job everything required to see what happened without re-running it.

## Decision

`retries` is 0 unless `E2E_RETRIES` is set. Traces (`retain-on-failure`) and screenshots (`only-on-failure`) are recorded, the HTML report and a JUnit file are written to `out/`, and both CI systems keep `out/playwright-report/` and `out/test-results/` only when the job fails, for one week. A green run keeps nothing. `forbidOnly` is on in CI so a committed `test.only` fails the build.

## Consequences

- A flaky test is visible on the first occurrence. The remedy is to fix it (a wait for a real condition, not a timeout), not to retry.
- The cost of keeping artifacts on failure only is that a passing run leaves no JUnit file for GitLab's test summary on merge requests. To get it, change `when: on_failure` to `when: always` in `.gitlab-ci.yml` and accept the storage.
- `E2E_RETRIES=1` is available for a site that has a known flaky third-party widget; set it on that job only.

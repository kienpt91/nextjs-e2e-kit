// Runs the unit and integration tests with coverage and fails below the thresholds. The files measured are the ones these tests are
// meant to cover: the database layer, the content model and repository, the fault switch, and the pure helpers of the E2E suite and of
// the negative controls. The React components, the Next.js routes and the Playwright specs are covered by the browser suite instead:
// line coverage of a page says nothing about whether a user can use it, so it is not measured for them.
import { spawnSync } from "node:child_process";

const include = [
  "src/db/**/*.ts",
  "src/content/model.ts",
  "src/content/pg-content-repository.ts",
  "src/faults.ts",
  "e2e/support/links.ts",
  "scripts/negative-control-lib.ts",
];
const thresholds = { lines: 90, branches: 80, functions: 90 };

const result = spawnSync(
  process.execPath,
  [
    "--test",
    "--test-concurrency=1",
    "--experimental-test-coverage",
    ...include.map((p) => `--test-coverage-include=${p}`),
    `--test-coverage-lines=${thresholds.lines}`,
    `--test-coverage-branches=${thresholds.branches}`,
    `--test-coverage-functions=${thresholds.functions}`,
    "test/**/*.test.ts",
  ],
  { stdio: "inherit" },
);
process.exitCode = result.status ?? 1;

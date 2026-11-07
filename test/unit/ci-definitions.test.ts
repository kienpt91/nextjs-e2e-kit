import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { checkGitLabPipeline, checkRepositoryRules } from "../../scripts/lint-ci-lib.ts";

const root = new URL("../../", import.meta.url);
const read = (path: string) => readFileSync(fileURLToPath(new URL(path, root)), "utf8");
const gitlabText = read(".gitlab-ci.yml");
const gitlab = parse(gitlabText) as Record<string, Record<string, unknown>>;
const workflowNames = readdirSync(fileURLToPath(new URL(".github/workflows", root))).filter((f) => f.endsWith(".yml"));
const workflows = Object.fromEntries(workflowNames.map((f) => [f, parse(read(`.github/workflows/${f}`)) as Record<string, unknown>]));
const pkg = JSON.parse(read("package.json")) as { devDependencies: Record<string, string> };

const playwrightImage = /mcr\.microsoft\.com\/playwright@sha256:([0-9a-f]{64})/;
const postgresImage = /postgres@sha256:([0-9a-f]{64})/;

describe("the CI definitions of this repository", () => {
  test("pass the repository rules (digest pins, SHA pins, read-only token)", () => {
    assert.deepEqual(checkRepositoryRules(gitlab, workflows), []);
  });

  test("the GitLab pipeline holds together", () => {
    assert.deepEqual(checkGitLabPipeline(gitlab), []);
  });

  test("the e2e job of GitLab runs migrate, seed, build and the suite, in that order, against a service named postgres", () => {
    const job = gitlab["e2e"] as { script: string[]; services?: unknown; extends: string[] };
    const script = job.script.join("\n");
    const order = ["db:wait", "db:migrate", "db:seed", "npm run build", "playwright test"].map((s) => script.indexOf(s));
    assert.ok(order.every((i) => i >= 0), `a step is missing: ${job.script.join(" | ")}`);
    assert.deepEqual([...order].sort((a, b) => a - b), order, "the steps are out of order");
    const service = (gitlab[".postgres"] as { services: { name: string; alias: string }[] }).services[0];
    assert.equal(service?.alias, "postgres");
    assert.ok(job.extends.includes(".postgres"));
    assert.match(String(gitlab["variables"]?.["DATABASE_URL"]), /@postgres:5432\//);
  });

  test("GitLab keeps the HTML report, the traces and the junit file when the e2e job fails, and for a limited time", () => {
    const artifacts = (gitlab["e2e"] as { artifacts: { when: string; expire_in: string; paths: string[]; reports: { junit: string } } }).artifacts;
    assert.equal(artifacts.when, "on_failure");
    assert.ok(artifacts.expire_in);
    assert.deepEqual(artifacts.paths, ["out/playwright-report/", "out/test-results/"]);
    assert.equal(artifacts.reports.junit, "out/test-results/junit.xml");
  });

  test("GitHub does the same in the same order and uploads the report only when something failed", () => {
    const steps = ((workflows["ci.yml"] as { jobs: Record<string, { steps: { run?: string; if?: string; uses?: string }[] }> }).jobs["e2e"] as { steps: { run?: string; if?: string; uses?: string }[] }).steps;
    const runs = steps.map((s) => s.run ?? "");
    const order = ["db:wait", "db:migrate", "db:seed", "npm run build", "playwright test"].map((s) => runs.findIndex((r) => r.includes(s)));
    assert.ok(order.every((i) => i >= 0));
    assert.deepEqual([...order].sort((a, b) => a - b), order);
    const upload = steps.find((s) => s.uses?.startsWith("actions/upload-artifact@"));
    assert.equal(upload?.if, "failure()");
  });

  test("both systems, the container scripts and the config use the same two images", () => {
    const files = [".gitlab-ci.yml", ".github/workflows/ci.yml", "scripts/node.sh", "scripts/with-postgres.sh"];
    const playwright = new Set(files.map((f) => playwrightImage.exec(read(f))?.[1]).filter((d) => d !== undefined));
    const postgres = new Set(files.map((f) => postgresImage.exec(read(f))?.[1]).filter((d) => d !== undefined));
    assert.equal(playwright.size, 1, `Playwright image digests differ: ${[...playwright].join(", ")}`);
    assert.equal(postgres.size, 1, `PostgreSQL image digests differ: ${[...postgres].join(", ")}`);
  });

  test("the version of the image is the exact version of @playwright/test, the browsers match the library", () => {
    const tag = /playwright@sha256:[0-9a-f]{64}\s+#\s+v(\d+\.\d+\.\d+)-noble/.exec(gitlabText)?.[1];
    assert.equal(tag, pkg.devDependencies["@playwright/test"]);
    assert.match(read("scripts/node.sh"), new RegExp(`tag v${pkg.devDependencies["@playwright/test"]?.replaceAll(".", "\\.")}-noble`));
    const lock = JSON.parse(read("package-lock.json")) as { packages: Record<string, { version: string }> };
    assert.equal(lock.packages["node_modules/@playwright/test"]?.version, pkg.devDependencies["@playwright/test"]);
  });

  test("every dependency is pinned exactly", () => {
    const all = { ...pkg.devDependencies, ...(JSON.parse(read("package.json")) as { dependencies: Record<string, string> }).dependencies };
    for (const [name, version] of Object.entries(all)) assert.match(version, /^\d+\.\d+\.\d+$/, `${name}@${version}`);
  });

  test("the invalid samples in test/fixtures are rejected by the rules (the schema part of the validator needs the network)", () => {
    const badGitlab = parse(read("test/fixtures/invalid-gitlab-ci.yml")) as unknown;
    const badWorkflow = parse(read("test/fixtures/invalid-workflows/bad.yml")) as unknown;
    assert.ok(checkGitLabPipeline(badGitlab).some((p) => p.includes('stage "e2e" is not in stages')));
    const problems = checkRepositoryRules(badGitlab, { "bad.yml": badWorkflow });
    for (const expected of ["not pinned by digest", "pull_request_target", "not pinned to a full commit SHA", "persist-credentials", "no top-level permissions"]) {
      assert.ok(problems.some((p) => p.includes(expected)), `missing: ${expected}`);
    }
  });
});

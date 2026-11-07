import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { checkGitLabPipeline, checkRepositoryRules } from "../../scripts/lint-ci-lib.ts";

const digest = `x@sha256:${"a".repeat(64)}`;
const sha = `actions/checkout@${"b".repeat(40)}`;

describe("checkGitLabPipeline", () => {
  test("accepts a pipeline that holds together", () => {
    const doc = {
      stages: ["check", "e2e"],
      ".node": { before_script: ["npm ci"] },
      lint: { stage: "check", extends: ".node", script: ["npm run lint"] },
      e2e: { stage: "e2e", needs: ["lint"], script: ["npx playwright test"] },
    };
    assert.deepEqual(checkGitLabPipeline(doc), []);
  });

  test("finds an unknown stage, a missing extends target and a missing need", () => {
    const problems = checkGitLabPipeline({
      stages: ["check"],
      a: { stage: "deploy", script: ["x"] },
      b: { stage: "check", extends: [".nope"], needs: ["ghost", { job: "a" }], script: ["x"] },
    });
    assert.deepEqual(problems, [
      'a: stage "deploy" is not in stages (check)',
      'b: extends ".nope", which is not defined',
      'b: needs "ghost", which is not defined',
    ]);
  });

  test("uses GitLab's default stages when none are given, and a job without a stage is in test", () => {
    assert.deepEqual(checkGitLabPipeline({ a: { script: ["x"] } }), []);
    assert.deepEqual(checkGitLabPipeline({ a: { stage: "check", script: ["x"] } }), ['a: stage "check" is not in stages (build, test, deploy)']);
  });

  test("a file that is not a mapping, or has no job, is a problem", () => {
    assert.deepEqual(checkGitLabPipeline([1]), ["the file is not a mapping"]);
    assert.deepEqual(checkGitLabPipeline({ stages: ["a"] }), ["the pipeline has no job"]);
  });
});

describe("checkRepositoryRules", () => {
  const goodGitlab = { default: { image: digest }, job: { services: [{ name: digest, alias: "postgres" }], script: ["x"] } };
  const goodWorkflow = {
    permissions: { contents: "read" },
    on: { push: {} },
    jobs: {
      test: {
        container: { image: digest },
        services: { postgres: { image: digest } },
        steps: [{ uses: sha, with: { "persist-credentials": false } }, { run: "x" }],
      },
    },
  };

  test("accepts digest pins, SHA pins and a read-only token", () => {
    assert.deepEqual(checkRepositoryRules(goodGitlab, { "ci.yml": goodWorkflow }), []);
  });

  test("finds images that are pinned only by tag", () => {
    const problems = checkRepositoryRules(
      { default: { image: "node:24" }, job: { services: ["postgres:16"], script: ["x"] } },
      { "ci.yml": { ...goodWorkflow, jobs: { test: { container: "node:24", services: { db: { image: "postgres:16" } }, steps: [] } } } },
    );
    assert.equal(problems.length, 5);
    assert.ok(problems.every((p) => p.includes("not pinned by digest")));
  });

  test("finds an action pinned by tag and a checkout that keeps the token", () => {
    const problems = checkRepositoryRules(goodGitlab, {
      "ci.yml": { ...goodWorkflow, jobs: { test: { steps: [{ uses: "actions/checkout@v4" }, { uses: `actions/checkout@${"c".repeat(40)}` }] } } },
    });
    assert.deepEqual(problems, [
      'ci.yml: test uses "actions/checkout@v4", which is not pinned to a full commit SHA',
      "ci.yml: test checkout keeps the token in .git (persist-credentials is not false)",
      "ci.yml: test checkout keeps the token in .git (persist-credentials is not false)",
    ]);
  });

  test("finds a missing or writable permissions block and pull_request_target", () => {
    assert.deepEqual(checkRepositoryRules(null, { "a.yml": { on: { push: {} }, jobs: {} } }), ["a.yml: no top-level permissions block"]);
    assert.deepEqual(checkRepositoryRules(null, { "a.yml": { permissions: { contents: "write" }, jobs: {} } }), ["a.yml: the top-level permissions are not read-only"]);
    assert.deepEqual(checkRepositoryRules(null, { "a.yml": { permissions: "read-all", on: { pull_request_target: {} }, jobs: {} } }), [
      "a.yml: pull_request_target runs with secrets on code from forks",
    ]);
    assert.deepEqual(checkRepositoryRules(null, { "a.yml": "text" }), ["a.yml: not a mapping"]);
  });

  test("local actions need no pin", () => {
    const problems = checkRepositoryRules(null, { "a.yml": { permissions: { contents: "read" }, jobs: { t: { steps: [{ uses: "./.github/actions/x" }] } } } });
    assert.deepEqual(problems, []);
  });
});

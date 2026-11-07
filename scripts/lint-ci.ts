// Validates .gitlab-ci.yml and .github/workflows/*.yml without a GitLab or GitHub server:
//   1. the YAML parses;
//   2. it validates against the vendor's JSON schema (GitLab's own ci.json from its source tree, SchemaStore's github-workflow.json),
//      each pinned by commit and checked by SHA-256 after the download;
//   3. the pipeline holds together (stages, extends, needs) and follows this repository's rules (digest and SHA pins, read-only token).
// What this cannot know is whether a real GitLab accepts the file on your instance (runners, tags, protected variables): see docs/ci.md.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Ajv } from "ajv";
import { parse } from "yaml";
import type { ErrorObject } from "ajv";
import { checkGitLabPipeline, checkRepositoryRules } from "./lint-ci-lib.ts";

const schemas = {
  gitlab: {
    url: "https://gitlab.com/gitlab-org/gitlab/-/raw/28aa2bf90771a11ecc2f86525bc8a70a49c4d810/app/assets/javascripts/editor/schema/ci.json",
    sha256: "1c6eeb7d3a34c39996afbfe1ade220480eb05bbeae674e86d3c745dfeeded7fd",
  },
  github: {
    url: "https://raw.githubusercontent.com/SchemaStore/schemastore/8b994c014937a9332f2fb53d993eb1a30705677c/src/schemas/json/github-workflow.json",
    sha256: "d10c9f4656e1bd5bc6727e9b35080e017dc167154726fca93da33c7a6bd1c4f3",
  },
} as const;

const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

async function schemaText(name: keyof typeof schemas): Promise<string> {
  const { url, sha256: want } = schemas[name];
  const cached = join("out", "schemas", `${name}.json`);
  const text = existsSync(cached) ? readFileSync(cached, "utf8") : await (await fetch(url)).text();
  if (sha256(text) !== want) throw new Error(`the ${name} schema does not match the pinned hash (${url})`);
  mkdirSync(join("out", "schemas"), { recursive: true });
  writeFileSync(cached, text);
  return text;
}

function validator(text: string) {
  // formats are not checked (that needs another package), everything else in the schema is
  const ajv = new Ajv({ strict: false, allErrors: true, validateFormats: false });
  return ajv.compile(JSON.parse(text));
}

let problems = 0;
const describeError = (e: ErrorObject) =>
  `${e.instancePath || "/"} ${e.message ?? ""}${e.keyword === "additionalProperties" ? ` ("${String(e.params["additionalProperty"])}")` : ""}`;
const report = (file: string, issues: string[]) => {
  if (issues.length === 0) console.log(`ok       ${file}`);
  for (const issue of issues) {
    problems += 1;
    console.log(`PROBLEM  ${file}: ${issue}`);
  }
};

// usage: node scripts/lint-ci.ts [--gitlab FILE] [--workflows DIR]      (defaults: .gitlab-ci.yml and .github/workflows)
const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const at = args.indexOf(name);
  return at >= 0 && args[at + 1] !== undefined ? (args[at + 1] as string) : fallback;
};
const gitlabFile = option("--gitlab", ".gitlab-ci.yml");
const workflowsDir = option("--workflows", ".github/workflows");
const gitlab = parse(readFileSync(gitlabFile, "utf8")) as unknown;
const validateGitlab = validator(await schemaText("gitlab"));
report(gitlabFile, validateGitlab(gitlab) ? [] : (validateGitlab.errors ?? []).map(describeError));
report(`${gitlabFile} (stages, extends, needs)`, checkGitLabPipeline(gitlab));

const validateGithub = validator(await schemaText("github"));
const workflows: Record<string, unknown> = {};
for (const name of readdirSync(workflowsDir).filter((f) => f.endsWith(".yml"))) {
  const file = `${workflowsDir}/${name}`;
  workflows[file] = parse(readFileSync(file, "utf8")) as unknown;
  report(file, validateGithub(workflows[file]) ? [] : (validateGithub.errors ?? []).map(describeError));
}
report("repository rules (digest and SHA pins, read-only token)", checkRepositoryRules(gitlab, workflows));

console.log(problems === 0 ? "\nall CI definitions are valid" : `\n${problems} problem(s)`);
process.exitCode = problems === 0 ? 0 : 1;

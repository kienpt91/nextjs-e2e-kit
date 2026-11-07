// Rules of our own for the CI definitions, on top of the vendors' JSON schemas (the schemas say what is valid; these say what this
// repository requires). Pure functions over parsed YAML, tested in test/unit/lint-ci-lib.test.ts.

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);

const RESERVED = new Set([
  "image", "services", "stages", "types", "before_script", "after_script", "variables", "cache", "include", "workflow", "default", "pages",
]);

/** Problems GitLab only finds when it builds the pipeline: unknown stages, missing `extends` targets, missing `needs`. */
export function checkGitLabPipeline(doc: unknown): string[] {
  const problems: string[] = [];
  if (!isObject(doc)) return ["the file is not a mapping"];
  const stages = Array.isArray(doc["stages"]) ? (doc["stages"] as string[]) : ["build", "test", "deploy"];
  const entries = Object.entries(doc).filter(([name, v]) => !RESERVED.has(name) && isObject(v));
  const names = new Set(entries.map(([name]) => name));
  const jobs = entries.filter(([name]) => !name.startsWith("."));
  if (jobs.length === 0) problems.push("the pipeline has no job");
  for (const [name, job] of jobs) {
    const j = job as Json;
    const stage = typeof j["stage"] === "string" ? j["stage"] : "test";
    if (!stages.includes(stage)) problems.push(`${name}: stage "${stage}" is not in stages (${stages.join(", ")})`);
    const extendsList = j["extends"] === undefined ? [] : Array.isArray(j["extends"]) ? j["extends"] : [j["extends"]];
    for (const target of extendsList) if (!names.has(String(target))) problems.push(`${name}: extends "${String(target)}", which is not defined`);
    for (const need of Array.isArray(j["needs"]) ? j["needs"] : []) {
      const needName = isObject(need) ? String(need["job"]) : String(need);
      if (!names.has(needName)) problems.push(`${name}: needs "${needName}", which is not defined`);
    }
  }
  return problems;
}

const DIGEST = /@sha256:[0-9a-f]{64}$/;
const SHA = /^[^@\s]+@[0-9a-f]{40}$/;

/** Rules for this repository: images by digest, actions by commit SHA, read-only token, no secret-bearing triggers. */
export function checkRepositoryRules(gitlab: unknown, workflows: Record<string, unknown>): string[] {
  const problems: string[] = [];

  const imageOf = (v: unknown): string | null => (typeof v === "string" ? v : isObject(v) && typeof v["name"] === "string" ? v["name"] : null);
  if (isObject(gitlab)) {
    const refs: [string, string | null][] = [["default.image", imageOf(isObject(gitlab["default"]) ? gitlab["default"]["image"] : null)]];
    for (const [name, value] of Object.entries(gitlab)) {
      if (!isObject(value)) continue;
      refs.push([`${name}.image`, imageOf(value["image"])]);
      for (const [i, service] of (Array.isArray(value["services"]) ? value["services"] : []).entries()) refs.push([`${name}.services[${i}]`, imageOf(service)]);
    }
    for (const [where, image] of refs) if (image !== null && !DIGEST.test(image)) problems.push(`GitLab CI: ${where} "${image}" is not pinned by digest`);
  }

  for (const [file, doc] of Object.entries(workflows)) {
    if (!isObject(doc)) {
      problems.push(`${file}: not a mapping`);
      continue;
    }
    const permissions = doc["permissions"];
    if (!isObject(permissions) && permissions !== "read-all") problems.push(`${file}: no top-level permissions block`);
    if (isObject(permissions) && Object.entries(permissions).some(([, level]) => level !== "read" && level !== "none")) {
      problems.push(`${file}: the top-level permissions are not read-only`);
    }
    const on = doc["on"];
    if (isObject(on) && "pull_request_target" in on) problems.push(`${file}: pull_request_target runs with secrets on code from forks`);
    for (const [jobName, job] of Object.entries(isObject(doc["jobs"]) ? doc["jobs"] : {})) {
      if (!isObject(job)) continue;
      const container = imageOf(job["container"]);
      if (container !== null && !DIGEST.test(container)) problems.push(`${file}: ${jobName} container "${container}" is not pinned by digest`);
      for (const [serviceName, service] of Object.entries(isObject(job["services"]) ? job["services"] : {})) {
        const image = imageOf(isObject(service) ? service["image"] : null);
        if (image !== null && !DIGEST.test(image)) problems.push(`${file}: ${jobName} service ${serviceName} "${image}" is not pinned by digest`);
      }
      for (const step of Array.isArray(job["steps"]) ? job["steps"] : []) {
        if (!isObject(step)) continue;
        const uses = step["uses"];
        if (typeof uses === "string" && !uses.startsWith("./") && !SHA.test(uses)) problems.push(`${file}: ${jobName} uses "${uses}", which is not pinned to a full commit SHA`);
        if (typeof uses === "string" && uses.startsWith("actions/checkout@") && !(isObject(step["with"]) && step["with"]["persist-credentials"] === false)) {
          problems.push(`${file}: ${jobName} checkout keeps the token in .git (persist-credentials is not false)`);
        }
      }
    }
  }
  return problems;
}

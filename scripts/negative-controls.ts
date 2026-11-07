// Starts the built site once per fault (DEMO_FAULT), runs the whole suite against it and checks that exactly the tests that guard
// the broken behaviour fail. Run it through scripts/negative-controls.sh, which provides the database and builds the site.
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { FAULTS } from "../src/faults.ts";
import { judge, plan, summarise } from "./negative-control-lib.ts";
import type { JsonReport } from "./negative-control-lib.ts";

mkdirSync("out", { recursive: true });
const reportFile = "out/negative-control-run.json";

function run(fault: string | null): JsonReport {
  const env = { ...process.env, DEMO_FAULT: fault ?? "", PLAYWRIGHT_JSON_OUTPUT_NAME: reportFile };
  const result = spawnSync("npx", ["playwright", "test", "--reporter=json"], { env, encoding: "utf8", stdio: ["ignore", "ignore", "pipe"] });
  try {
    return JSON.parse(readFileSync(reportFile, "utf8")) as JsonReport;
  } catch {
    throw new Error(`no report for ${fault ?? "the baseline"}: ${result.stderr.slice(0, 2000)}`);
  }
}

const lines: string[] = [];
const out = (line: string) => {
  lines.push(line);
  console.log(line);
};
let failures = 0;

const baseline = summarise(run(null));
out(`baseline (no fault): ${baseline.total - baseline.failed.length} of ${baseline.total} tests pass`);
if (baseline.failed.length > 0) {
  failures += 1;
  for (const f of baseline.failed) out(`  FAILED ${f.title}`);
}
out("");
out(`${"fault".padEnd(28)} ${"tests failed".padEnd(13)} ${"behaviours that failed".padEnd(40)} result`);
for (const fault of FAULTS) {
  const summary = summarise(run(fault));
  const verdict = judge(plan[fault], summary);
  out(
    `${fault.padEnd(28)} ${`${summary.failed.length} of ${summary.total}`.padEnd(13)} ${verdict.failingTags.map((t) => `@${t}`).join(" ").padEnd(40)} ${verdict.ok ? "ok" : `WRONG: ${verdict.message}`}`,
  );
  if (!verdict.ok) failures += 1;
}
out("");
out(failures === 0 ? `every one of the ${FAULTS.length} faults was caught by the tests that guard it, and only by those` : `${failures} problem(s)`);
writeFileSync("out/negative-controls.txt", `${lines.join("\n")}\n`);
process.exitCode = failures === 0 ? 0 : 1;

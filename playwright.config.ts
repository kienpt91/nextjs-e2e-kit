import { defineConfig } from "@playwright/test";

const port = Number(process.env["E2E_PORT"] ?? 3000);
const baseURL = process.env["E2E_BASE_URL"] ?? `http://127.0.0.1:${port}`;
// Set when the site is already running somewhere (a staging URL, a docker-compose service): the suite then starts nothing.
const external = process.env["E2E_BASE_URL"] !== undefined;

export default defineConfig({
  testDir: "e2e",
  // One site, one database: a failure must show up as a failure, so there are no retries unless E2E_RETRIES asks for them.
  retries: Number(process.env["E2E_RETRIES"] ?? 0),
  workers: Number(process.env["E2E_WORKERS"] ?? 2),
  fullyParallel: true,
  forbidOnly: Boolean(process.env["CI"]),
  timeout: 30_000,
  expect: { timeout: 5_000 },
  outputDir: "out/test-results",
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "out/playwright-report" }],
    ["junit", { outputFile: "out/test-results/junit.xml" }],
  ],
  use: {
    baseURL,
    // the trace of a failed test has the DOM, the network and a screenshot of every step
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "en-GB",
    timezoneId: "UTC",
  },
  projects: [
    {
      name: "desktop",
      testIgnore: ["**/*.mobile.spec.ts", "**/*.reduced-motion.spec.ts"],
      use: { browserName: "chromium", viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile",
      testMatch: "**/*.mobile.spec.ts",
      use: { browserName: "chromium", viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    },
    {
      name: "reduced-motion",
      testMatch: "**/*.reduced-motion.spec.ts",
      use: { browserName: "chromium", viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" },
    },
  ],
  webServer: external
    ? undefined
    : {
        // the site is built before the run (npm run build); DATABASE_URL and DEMO_FAULT come from the environment
        command: "npm run start",
        url: baseURL,
        env: { PORT: String(port) },
        reuseExistingServer: false,
        timeout: 60_000,
      },
});

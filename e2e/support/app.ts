import { expect } from "@playwright/test";
import type { Page, Response } from "@playwright/test";

/**
 * Goes to a path and waits until the page has hydrated (src/ui/hydration-flag.tsx sets data-hydrated on <html>). Returns the response
 * of the navigation so a test can check its status. Use it instead of page.goto in every test that clicks, types or scrolls.
 */
export async function open(page: Page, path: string): Promise<Response> {
  const response = await page.goto(path);
  expect(response, `no response for ${path}`).not.toBeNull();
  await page.waitForFunction(() => document.documentElement.dataset["hydrated"] === "true");
  return response as Response;
}

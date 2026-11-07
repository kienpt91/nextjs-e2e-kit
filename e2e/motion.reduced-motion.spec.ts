import { expect, test } from "@playwright/test";
import { open } from "./support/app.ts";
import { homeSections } from "./support/site-contract.ts";

// This file runs in the "reduced-motion" project, which starts the browser with prefers-reduced-motion: reduce.
test.describe("prefers-reduced-motion: reduce", () => {
  test.beforeEach(async ({ page }) => {
    await open(page, "/");
  });

  test("the browser really reports the preference", { tag: "@reduced-motion" }, async ({ page }) => {
    expect(await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  });

  test("every section is fully visible without scrolling", { tag: "@reduced-motion" }, async ({ page }) => {
    const main = page.getByRole("main");
    for (const name of homeSections) {
      const section = main.getByRole("region", { name });
      // opacity and transform are what the fade-in animates; toBeVisible alone would pass for a section at opacity 0
      await expect(section).toHaveCSS("opacity", "1");
      await expect(section).toHaveCSS("transform", "none");
      await expect(section.getByRole("heading", { level: 2 })).toBeVisible();
    }
  });

  test("nothing animates: transitions are off", { tag: "@reduced-motion" }, async ({ page }) => {
    const section = page.getByRole("main").getByRole("region", { name: homeSections[0] });
    await expect(section).toHaveCSS("transition-duration", "0s");
    await expect(page.getByRole("banner")).toHaveCSS("transition-duration", "0s");
  });

  test("the content is still there after scrolling to the end", { tag: "@reduced-motion" }, async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const last = page.getByRole("main").getByRole("region").last();
    await expect(last).toHaveCSS("opacity", "1");
    await expect(last).toBeInViewport();
  });
});

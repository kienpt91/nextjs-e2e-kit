import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { open } from "./support/app.ts";
import { publishedPages } from "./support/site-contract.ts";

const bar = (page: Page) => page.getByRole("complementary", { name: "Quick contact" });

test("the phone project is 375 by 812", { tag: "@viewport" }, async ({ page }) => {
  // a guard against the project being edited by accident: every other test in this file is about this size
  expect(page.viewportSize()).toEqual({ width: 375, height: 812 });
});

test.describe("no horizontal scroll at 375 px", () => {
  for (const { path } of publishedPages) {
    test(path, { tag: "@no-overflow" }, async ({ page }) => {
      await open(page, path);
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth, `the page is ${scrollWidth}px wide in a ${clientWidth}px screen`).toBeLessThanOrEqual(clientWidth);
    });
  }
});

test.describe("quick contact bar", () => {
  test("is visible at the bottom of the screen on load", { tag: "@contact-bar" }, async ({ page }) => {
    await open(page, "/");
    await expect(bar(page)).toBeVisible();
    await expect(bar(page)).toBeInViewport({ ratio: 1 });
    const box = await bar(page).boundingBox();
    expect(box).not.toBeNull();
    // it sits on the bottom edge of the 812 px screen
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeCloseTo(812, 0);
  });

  test("stays on screen while the page scrolls, on every page", { tag: "@contact-bar" }, async ({ page }) => {
    for (const { path } of publishedPages) {
      await open(page, path);
      await page.mouse.wheel(0, 700);
      await expect(bar(page), path).toBeInViewport({ ratio: 1 });
    }
  });

  test("offers a phone link, an e-mail link and the contact page", { tag: "@contact-bar" }, async ({ page }) => {
    await open(page, "/");
    await expect(bar(page).getByRole("link", { name: /call/i })).toHaveAttribute("href", /^tel:\+?\d+$/);
    await expect(bar(page).getByRole("link", { name: /e-?mail/i })).toHaveAttribute("href", /^mailto:/);
    await expect(bar(page).getByRole("link", { name: /message/i })).toHaveAttribute("href", "/contact");
  });

  test("does not cover the last link of the page", { tag: "@contact-bar-clearance" }, async ({ page }) => {
    await open(page, "/");
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    // a trial click runs every check of a real click (visible, stable, receives the pointer events) and stops before clicking:
    // it fails when another element, such as a fixed bar, is on top of the link
    await page.getByRole("contentinfo").getByRole("link").last().click({ trial: true, timeout: 3_000 });
  });
});

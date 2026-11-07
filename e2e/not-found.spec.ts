import { expect, test } from "@playwright/test";
import { open } from "./support/app.ts";
import { unpublishedPaths } from "./support/site-contract.ts";

test.describe("custom 404", () => {
  test("an unknown address shows the custom page with status 404", { tag: "@not-found" }, async ({ page }) => {
    const response = await open(page, "/this-page-does-not-exist");
    expect(response.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: /page not found/i })).toBeVisible();
    await expect(page).toHaveTitle(/not found/i);
    // the page is part of the site: the header and the footer are there, and there is a way out
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
    await page.getByRole("main").getByRole("link", { name: /homepage/i }).click();
    await expect(page).toHaveURL("/");
  });

  test("a nested unknown address answers 404 too", { tag: "@not-found" }, async ({ request }) => {
    const response = await request.get("/services/nothing/here");
    expect(response.status()).toBe(404);
    expect(await response.text()).toContain("Page not found");
  });

  test("a page that exists but is not published answers 404", { tag: "@not-found" }, async ({ request }) => {
    for (const path of unpublishedPaths) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(404);
    }
  });

  test("an address that cannot be a page is refused the same way", { tag: "@not-found" }, async ({ request }) => {
    for (const path of ["/Bad%20Path", "/a//b", "/%00", "/about/../../etc/passwd"]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(404);
    }
  });
});

import { expect, test } from "@playwright/test";
import { open } from "./support/app.ts";
import { homeSections, publishedPages } from "./support/site-contract.ts";

test.describe("homepage", () => {
  test("answers 200 and shows one main heading", { tag: "@home" }, async ({ page }) => {
    const response = await open(page, "/");
    expect(response.status()).toBe(200);
    await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("shows its sections in reading order", { tag: "@home-sections" }, async ({ page }) => {
    await open(page, "/");
    const main = page.getByRole("main");
    // toHaveText with a list asserts the whole list, in order: a missing, extra or swapped section fails
    await expect(main.getByRole("heading", { level: 2 })).toHaveText([...homeSections]);
    // each heading names a region, so a screen reader user can jump to the section
    for (const name of homeSections) {
      await expect(main.getByRole("region", { name }).getByRole("heading", { level: 2 })).toBeVisible();
    }
  });
});

test.describe("page titles", () => {
  for (const { path, title } of publishedPages) {
    test(`${path} answers 200 with its own title`, { tag: "@titles" }, async ({ page }) => {
      const response = await open(page, path);
      expect(response.status()).toBe(200);
      await expect(page).toHaveTitle(title);
    });
  }
});

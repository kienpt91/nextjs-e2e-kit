import { expect, test } from "@playwright/test";
import { open } from "./support/app.ts";
import { mainNavigation } from "./support/site-contract.ts";

const TRANSPARENT = "rgba(0, 0, 0, 0)";
const SOLID = "rgb(255, 255, 255)";

test.describe("header on desktop", () => {
  test("is transparent over the hero and solid after scrolling", { tag: "@header" }, async ({ page }) => {
    await open(page, "/");
    const header = page.getByRole("banner");
    await expect(header).toHaveCSS("background-color", TRANSPARENT);

    await page.mouse.wheel(0, 600);
    await expect(header).toHaveCSS("background-color", SOLID);
    // the text stays readable on the new background
    await expect(header.getByRole("link", { name: "Lantern Studio" })).toHaveCSS("color", "rgb(17, 24, 39)");

    await page.mouse.wheel(0, -2000);
    await expect(header).toHaveCSS("background-color", TRANSPARENT);
  });

  test("stays at the top of the viewport while the page scrolls", { tag: "@header" }, async ({ page }) => {
    await open(page, "/about");
    await page.mouse.wheel(0, 500);
    await expect(page.getByRole("banner")).toBeInViewport({ ratio: 1 });
  });

  test("shows the links inline and no menu button", { tag: "@header" }, async ({ page }) => {
    await open(page, "/");
    const nav = page.getByRole("navigation", { name: "Main", exact: true });
    for (const name of mainNavigation) await expect(nav.getByRole("link", { name })).toBeVisible();
    await expect(page.getByRole("button", { name: "Menu", exact: true })).toBeHidden();
  });
});

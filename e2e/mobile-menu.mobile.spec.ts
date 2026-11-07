import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { open } from "./support/app.ts";
import { mainNavigation } from "./support/site-contract.ts";

// exact: true, because "Close menu" also contains the word "menu"
const menuButton = (page: Page) => page.getByRole("button", { name: "Menu", exact: true });
const closeButton = (page: Page) => page.getByRole("button", { name: "Close menu", exact: true });
const menuDialog = (page: Page) => page.getByRole("dialog", { name: "Main menu" });

test.describe("mobile menu", () => {
  test.beforeEach(async ({ page }) => {
    await open(page, "/");
  });

  test("hides the inline links and opens a dialog from the Menu button", { tag: "@menu-open" }, async ({ page }) => {
    await expect(page.getByRole("navigation", { name: "Main", exact: true })).toBeHidden();
    await expect(menuDialog(page)).toBeHidden();
    await expect(menuButton(page)).toHaveAttribute("aria-expanded", "false");

    await menuButton(page).click();
    await expect(menuDialog(page)).toBeVisible();
    await expect(menuButton(page)).toHaveAttribute("aria-expanded", "true");
    // focus moves into the dialog, onto its close button
    await expect(closeButton(page)).toBeFocused();
    const nav = menuDialog(page).getByRole("navigation");
    for (const name of mainNavigation) await expect(nav.getByRole("link", { name })).toBeVisible();
  });

  test("closes with Escape", { tag: "@menu-escape" }, async ({ page }) => {
    await menuButton(page).click();
    await expect(menuDialog(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menuDialog(page)).toBeHidden();
  });

  test("gives focus back to the Menu button after Escape", { tag: "@menu-focus-return" }, async ({ page }) => {
    await menuButton(page).click();
    await page.keyboard.press("Escape");
    await expect(menuDialog(page)).toBeHidden();
    await expect(menuButton(page)).toBeFocused();
  });

  test("closes with the Close button and gives focus back to the Menu button", { tag: "@menu-focus-return" }, async ({ page }) => {
    await menuButton(page).click();
    await closeButton(page).click();
    await expect(menuDialog(page)).toBeHidden();
    await expect(menuButton(page)).toBeFocused();
    await expect(menuButton(page)).toHaveAttribute("aria-expanded", "false");
  });

  test("keeps keyboard focus inside while it is open", { tag: "@menu-focus-trap" }, async ({ page }) => {
    await menuButton(page).click();
    const dialog = menuDialog(page);
    const stops = await dialog.getByRole("link").count();
    // Tab through every link and one more press: focus wraps to the close button instead of leaving for the page behind
    for (let i = 0; i < stops; i++) await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(closeButton(page)).toBeFocused();
    // and Shift+Tab from the close button goes to the last link, not out of the dialog
    await page.keyboard.press("Shift+Tab");
    await expect(dialog.getByRole("link").last()).toBeFocused();
  });

  test("following a link goes to the page and closes the menu", { tag: "@menu-open" }, async ({ page }) => {
    await menuButton(page).click();
    await menuDialog(page).getByRole("link", { name: /pricing/i }).click();
    await expect(page).toHaveURL(/\/pricing$/);
    await expect(menuDialog(page)).toBeHidden();
  });
});

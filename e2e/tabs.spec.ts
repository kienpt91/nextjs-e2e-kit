import { expect, test } from "@playwright/test";
import { open } from "./support/app.ts";

test.describe("services tabs", () => {
  test.beforeEach(async ({ page }) => {
    await open(page, "/");
  });

  test("expose the tabs pattern to assistive technology", { tag: "@tabs-aria" }, async ({ page }) => {
    const tablist = page.getByRole("tablist", { name: /services/i });
    const tabs = tablist.getByRole("tab");
    await expect(tabs).toHaveCount(3);

    // nothing is chosen yet: the first tab is selected and its panel is named after it
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "false");
    await expect(page.getByRole("tabpanel")).toHaveAccessibleName(await tabs.nth(0).innerText());

    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "false");
    await expect(page.getByRole("tabpanel")).toHaveCount(1);
    await expect(page.getByRole("tabpanel")).toHaveAccessibleName(await tabs.nth(1).innerText());

    // roving tab index: only the selected tab is in the tab order
    await expect(tabs.nth(1)).toHaveAttribute("tabindex", "0");
    await expect(tabs.nth(0)).toHaveAttribute("tabindex", "-1");
    await expect(tabs.nth(2)).toHaveAttribute("tabindex", "-1");
  });

  test("move with Left and Right arrows, wrap around, and jump with Home and End", { tag: "@tabs-keyboard" }, async ({ page }) => {
    const tabs = page.getByRole("tablist", { name: /services/i }).getByRole("tab");
    const panel = page.getByRole("tabpanel");

    await tabs.nth(0).focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(1)).toBeFocused();
    await expect(panel).toHaveAccessibleName(await tabs.nth(1).innerText());

    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(2)).toBeFocused();
    await expect(panel).toHaveAccessibleName(await tabs.nth(2).innerText());

    // past the last tab comes the first
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(0)).toBeFocused();
    await expect(panel).toHaveAccessibleName(await tabs.nth(0).innerText());

    // before the first tab comes the last
    await page.keyboard.press("ArrowLeft");
    await expect(tabs.nth(2)).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(tabs.nth(1)).toBeFocused();

    await page.keyboard.press("Home");
    await expect(tabs.nth(0)).toBeFocused();
    await page.keyboard.press("End");
    await expect(tabs.nth(2)).toBeFocused();
  });

  test("leave the tab list with Tab and go to the panel's content", { tag: "@tabs-keyboard" }, async ({ page }) => {
    const tabs = page.getByRole("tablist", { name: /services/i }).getByRole("tab");
    await tabs.nth(0).focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("tabpanel").getByRole("link", { name: /learn more/i })).toBeFocused();
  });

  test("show the content of the tab that is clicked", { tag: "@tabs-click" }, async ({ page }) => {
    const tabs = page.getByRole("tablist", { name: /services/i }).getByRole("tab");
    const panel = page.getByRole("tabpanel");
    const before = (await panel.textContent()) ?? "";
    await tabs.nth(2).click();
    await expect(panel).toHaveAccessibleName(await tabs.nth(2).innerText());
    // the content really is another one, not only the label
    await expect(panel).not.toHaveText(before);
    await tabs.nth(0).click();
    await expect(panel).toHaveText(before);
  });
});

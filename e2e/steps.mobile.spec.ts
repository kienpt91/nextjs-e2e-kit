import { expect, test } from "@playwright/test";
import { open } from "./support/app.ts";

test.describe("step buttons on a phone", () => {
  test.beforeEach(async ({ page }) => {
    await open(page, "/");
  });

  test("all fit in the width of the screen and are big enough to touch", { tag: "@steps" }, async ({ page }) => {
    const steps = page.getByRole("group", { name: /how it works/i }).getByRole("button");
    await expect(steps).toHaveCount(3);
    await steps.first().scrollIntoViewIfNeeded();
    const width = page.viewportSize()?.width ?? 0;
    for (const step of await steps.all()) {
      const box = await step.boundingBox();
      expect(box, "a step button has no box").not.toBeNull();
      if (box === null) continue;
      expect(box.x, "starts inside the screen").toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, "ends inside the screen").toBeLessThanOrEqual(width);
      expect(box.height, "at least 44 CSS pixels tall").toBeGreaterThanOrEqual(44);
      expect(box.width, "at least 44 CSS pixels wide").toBeGreaterThanOrEqual(44);
    }
  });

  test("a tap on a step shows that step and marks it as the current one", { tag: "@steps" }, async ({ page }) => {
    const steps = page.getByRole("group", { name: /how it works/i }).getByRole("button");
    await steps.first().scrollIntoViewIfNeeded();
    await expect(steps.nth(0)).toHaveAttribute("aria-current", "step");

    for (const index of [1, 2, 0]) {
      await steps.nth(index).tap();
      await expect(steps.nth(index)).toHaveAttribute("aria-current", "step");
      await expect(page.getByRole("heading", { level: 3 })).toContainText(`Step ${index + 1}`);
      // exactly one step is current at a time
      await expect(page.getByRole("group", { name: /how it works/i }).locator('[aria-current="step"]')).toHaveCount(1);
    }
  });
});

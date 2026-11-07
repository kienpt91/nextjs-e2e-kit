import { expect, test } from "@playwright/test";
import { open } from "./support/app.ts";

// The control for the reduced-motion project: it proves that, WITHOUT the preference, the animation really is there. A reduced
// motion test that passes on a site with no animation at all would prove nothing.
test("without the preference, sections below the fold fade in as they scroll into view", { tag: "@motion-control" }, async ({ page }) => {
  await open(page, "/");
  // the last section of the page, whichever it is: it starts below the fold
  const last = page.getByRole("main").getByRole("region").last();
  await expect(last).toHaveCSS("opacity", "0");
  await last.scrollIntoViewIfNeeded();
  await expect(last).toHaveCSS("opacity", "1");
});

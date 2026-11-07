import { expect, test } from "@playwright/test";
import { open } from "./support/app.ts";

test("the quick contact bar is not shown on a desktop screen", { tag: "@contact-bar" }, async ({ page }) => {
  await open(page, "/");
  await expect(page.getByRole("complementary", { name: "Quick contact" })).toBeHidden();
});

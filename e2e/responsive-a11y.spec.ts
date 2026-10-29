import { expect, test, type Page } from "@playwright/test";

const viewports = [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
] as const;

const routes = [
  "/",
  "/system-design",
  "/system-design/chapter-1",
  "/system-design/experience",
  "/system-design/experience/chapter-1",
  "/play",
  "/play/slo-watch",
  "/projects",
  "/about",
] as const;

async function assertNoHorizontalScroll(page: Page) {
  const canScroll = await page.evaluate(() => {
    const before = window.scrollX;
    window.scrollTo(40, window.scrollY);
    const after = window.scrollX;
    window.scrollTo(0, window.scrollY);
    return after > before;
  });
  expect(canScroll).toBe(false);
}

test.describe("responsive + a11y smoke", () => {
  for (const vp of viewports) {
    test(`no horizontal scroll @ ${vp.width}`, async ({ page }) => {
      await page.setViewportSize(vp);
      for (const route of routes) {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(250);
        await assertNoHorizontalScroll(page);
        await expect(page.locator("#main")).toBeVisible();
      }
    });
  }

  test("mobile menu opens, Escape closes, focus stays usable", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.getByRole("button", { name: /Open menu/i }).click();
    await expect(page.getByRole("navigation", { name: "Mobile" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("navigation", { name: "Mobile" })).toHaveCount(0);

    await page.getByRole("button", { name: /Open menu/i }).click();
    await page
      .getByRole("navigation", { name: "Mobile" })
      .getByRole("link", { name: "Drills" })
      .click();
    await expect(page).toHaveURL(/\/play/);
  });

  test("book drawer is inert when closed on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/system-design/chapter-1");
    const aside = page.locator("aside.book-sidebar");
    await expect(aside).toHaveAttribute("data-open", "false");
    await expect(aside).toHaveAttribute("aria-hidden", "true");
    // Closed drawer controls must not be the first tab stop after skip.
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: /skip to content/i })).toBeFocused();
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(
      () => document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.textContent?.trim() ?? "",
    );
    expect(focused.toLowerCase()).not.toContain("close contents");
  });
});

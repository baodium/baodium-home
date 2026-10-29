import { expect, test } from "@playwright/test";

test.describe("Chapter 1 guided lab", () => {
  test.use({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
  });

  test("guided progress, pause, step, reset", async ({ page }) => {
    await page.goto("/system-design/experience/chapter-1");
    await expect(page.getByText(/Step 1 of 8/i).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Guided", exact: true }),
    ).toBeVisible();

    const playPause = page.getByRole("button", {
      name: /Play simulation|Pause simulation/,
    });
    await expect(playPause).toBeVisible();

    // Reduced motion may leave sim paused; toggle play then pause.
    if ((await playPause.getAttribute("aria-label")) === "Play simulation") {
      await playPause.click();
    }
    await expect(
      page.getByRole("button", { name: "Pause simulation" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Pause simulation" }).click();
    await expect(
      page.getByRole("button", { name: "Play simulation" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Single step" }).click();
    await page.getByRole("button", { name: "Replay from start" }).click();

    await expect(page.getByText(/Step 1 of 8/i).first()).toBeVisible();
    await expect(
      page.getByText(/Reduced motion/i).first(),
    ).toBeVisible();

    // Advance first guided CTA when present.
    const toggle = page.getByRole("button", { name: /Toggle page preview/i });
    if (await toggle.isVisible()) {
      await toggle.click();
    }
    const continueBtn = page.getByRole("button", { name: /^Continue$/ });
    await expect(continueBtn).toBeVisible();
  });

  test("keyboard reaches skip link then main chrome", async ({ page }) => {
    await page.goto("/system-design/experience/chapter-1");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: /skip to content/i });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main")).toBeVisible();
  });
});

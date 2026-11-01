import { expect, test } from "@playwright/test";

test.describe("Chapter 3 idempotency lab", () => {
  test.use({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
  });

  test("guided ledger, pause, and step", async ({ page }) => {
    await page.goto("/system-design/experience/chapter-3");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/charge the card once/i);
    await expect(page.getByText(/Step 1 of 8/i).first()).toBeVisible();
    await expect(page.locator(".react-flow")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Live metrics" })).toBeVisible();
    await expect(page.getByText(/simulation of one retry/i)).toBeVisible();

    const playPause = page.getByRole("button", { name: /Play simulation|Pause simulation/ });
    await expect(playPause).toBeVisible();
    if ((await playPause.getAttribute("aria-label")) === "Play simulation") {
      await playPause.click();
    }
    await page.getByRole("button", { name: "Pause simulation" }).click();
    await expect(page.getByRole("button", { name: "Play simulation" })).toBeVisible();
    await page.getByRole("button", { name: "Single step" }).click();
    await page.getByRole("button", { name: "Replay from start" }).click();
    await expect(page.getByText(/Step 1 of 8/i).first()).toBeVisible();

    const follow = page.getByRole("button", { name: "Follow this checkout" });
    await expect(follow).toBeVisible();
  });
});

import { expect, test } from "@playwright/test";

const drills = [
  "/play/slo-watch",
  "/play/traffic-surge",
  "/play/cascade",
  "/play/cache-roulette",
  "/play/tail-latency",
] as const;

test.describe("drill start / pause / reset", () => {
  test.use({
    viewport: { width: 1280, height: 800 },
    // Force continuous run so Pause is available (not step-only).
    reducedMotion: "no-preference",
  });

  for (const path of drills) {
    test(`${path} start, pause, resume, reset`, async ({ page }) => {
      await page.goto(path);
      // Ensure step mode is off so Pause appears.
      const step = page.getByRole("checkbox", { name: /Step mode/i });
      if (await step.count()) {
        if (await step.isChecked()) await step.click();
      }

      await page.getByRole("button", { name: /Start drill/i }).click();
      await expect(page.getByRole("button", { name: "Pause drill" })).toBeVisible({
        timeout: 8_000,
      });
      await page.getByRole("button", { name: "Pause drill" }).click();
      await expect(page.getByRole("button", { name: "Resume drill" })).toBeVisible();
      await page.getByRole("button", { name: "Resume drill" }).click();
      await expect(page.getByRole("button", { name: "Pause drill" })).toBeVisible();
      await page.getByRole("button", { name: "Reset drill" }).click();
      await expect(page.getByRole("button", { name: /Start drill/i })).toBeVisible();
    });
  }

  test("reduced motion defaults to step + reset", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto("/play/slo-watch");
    await page.getByRole("button", { name: /Start drill/i }).click();
    await expect(
      page.getByRole("button", { name: /Advance one simulation step/i }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset drill" })).toBeVisible();
    await page.getByRole("button", { name: "Reset drill" }).click();
    await expect(page.getByRole("button", { name: /Start drill/i })).toBeVisible();
    await context.close();
  });
});

import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
const lessons = [
  "setup",
  "metrics",
  "promql",
  "dashboards",
  "traces",
  "logs",
  "alerts",
  "incident",
];

test("hands-on course has eight actionable, independently reachable exercises", async ({
  page,
}) => {
  await page.goto("/sre-labs/observability");
  await expect(page.locator(".course-index > li")).toHaveCount(8);
  for (const slug of lessons) {
    const response = await page.goto(`/sre-labs/observability/${slug}`);
    expect(response?.ok()).toBe(true);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator(".course-steps > li")).toHaveCount(3);
    await expect(page.locator(".course-checkpoint")).toContainText(
      "node lab.mjs verify",
    );
    await expect(
      page.getByRole("navigation", { name: "Local tool shortcuts" }),
    ).toBeVisible();
  }
});

test("course download delivers the actual runnable source archive", async ({
  page,
}, testInfo) => {
  await page.goto("/sre-labs/observability");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Download the complete lab kit" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("baodium-observability-lab.zip");
  const target = testInfo.outputPath("lab.zip");
  await download.saveAs(target);
  const bytes = await readFile(target);
  expect(bytes.subarray(0, 2).toString()).toBe("PK");
  expect(bytes.length).toBeGreaterThan(10000);
});

test("mobile lesson syllabus, copy command, hints and next exercise work", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/sre-labs/observability/setup");
  const toggle = page.getByRole("button", {
    name: "Show course contents",
    exact: true,
  });
  await toggle.click();
  await expect(
    page.getByRole("link", { name: /05 Follow a checkout/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Hide course contents", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Copy command", exact: true })
    .first()
    .click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "node lab.mjs doctor",
  );
  await page
    .getByText("Need a hint or a troubleshooting path?", { exact: true })
    .click();
  await expect(page.locator(".course-hint")).toHaveAttribute("open", "");
  await page.getByRole("link", { name: /Next: Instrument requests/ }).click();
  await expect(page).toHaveURL(/observability\/metrics$/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    ),
  ).toBe(false);
});

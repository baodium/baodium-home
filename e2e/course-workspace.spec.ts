import { expect, test } from "@playwright/test";

test("guided workspace preserves notes, exports them, and rejects invalid evidence", async ({ page }) => {
  await page.goto("/sre-labs/observability/setup");
  const notebook = page.getByRole("textbox", { name: "Your lab notebook" });
  await notebook.fill("Prediction: all five services start.\nEvidence: all four tool interfaces respond.");
  await page.getByRole("button", { name: "Next task" }).click();
  await expect(page.locator(".course-workspace h2")).toHaveText("The five services are up");
  await page.reload();
  await expect(notebook).toHaveValue(/Prediction: all five/);
  await expect(page.locator(".course-workspace h2")).toHaveText("The five services are up");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download notes" }).click();
  expect((await downloadPromise).suggestedFilename()).toBe("setup-notes.md");
  await page.getByRole("button", { name: /Check the evidence/ }).click();
  const input = page.getByLabel("Import reports/setup.json");
  const upload = async (data: unknown) => input.setInputFiles({ name: "setup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(data)) });
  await upload({ course: "baodium-observability", checkpoint: "metrics", passed: true });
  await expect(page.getByRole("alert").filter({ hasText: "This lesson needs" })).toBeVisible();
  await upload({ course: "baodium-observability", checkpoint: "setup", passed: false });
  await expect(page.getByRole("alert").filter({ hasText: "This checkpoint failed" })).toBeVisible();
  await upload({ course: "baodium-observability", checkpoint: "setup", passed: true, checkedAt: "invalid", checks: [] });
  await expect(page.getByRole("alert").filter({ hasText: "missing its timestamp" })).toBeVisible();
  await upload({ course: "baodium-observability", checkpoint: "setup", passed: true, checkedAt: new Date().toISOString(), checks: ["Test fixture: all four interfaces respond"] });
  await expect(page.getByText("Passing report imported", { exact: true })).toBeVisible();
  await expect(page.getByText("Test fixture: all four interfaces respond")).toBeVisible();
  // A previous pass must not survive a failed replacement report.
  await upload({ course: "baodium-observability", checkpoint: "setup", passed: false });
  await expect(page.getByText("Passing report imported", { exact: true })).toHaveCount(0);
});

test("learning modes and project discovery work on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/labs");
  await expect(page.getByRole("region", { name: "Choose your learning mode" }).getByRole("link")).toHaveCount(3);
  await expect(page.getByText("Cybersecurity", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: /03 \/ REAL STACK/ }).click();
  await expect(page.getByRole("link", { name: "Create a Codespace" })).toHaveAttribute("href", "https://codespaces.new/baodium/baodium-home?ref=main");
  await expect(page.getByRole("textbox", { name: "Your lab notebook" })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.goto("/projects");
  await page.getByRole("link", { name: /Open Labs/ }).click();
  await expect(page).toHaveURL(/\/labs$/);
});

test("notebook remains usable when persistent storage is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new Error("Storage unavailable"); };
    Storage.prototype.getItem = () => { throw new Error("Storage unavailable"); };
  });
  await page.goto("/sre-labs/observability/setup");
  await page.getByRole("textbox", { name: "Your lab notebook" }).fill("Temporary notes");
  await page.getByRole("button", { name: "Next task" }).click();
  await expect(page.getByRole("textbox", { name: "Your lab notebook" })).toHaveValue("Temporary notes");
});

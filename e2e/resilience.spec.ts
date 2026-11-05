import { expect, test } from "@playwright/test";

test("reader and labs remain usable when browser storage is blocked", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() { throw new DOMException("Blocked", "SecurityError"); },
    });
  });
  for (const route of ["/system-design/chapter-1", "/system-design/experience", "/system-design/experience/chapter-1"]) {
    await page.goto(route);
    await expect(page.locator("#main")).toBeVisible();
    await expect(page.locator("h1").first()).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("mobile menu scrolls on short screens and returns focus on Escape", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 480 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Open menu" });
  await toggle.click();
  const menu = page.getByRole("navigation", { name: "Mobile" });
  const projects = menu.getByRole("link", { name: "Projects" });
  await projects.focus();
  await expect(projects).toBeInViewport();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Close menu" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await expect(menu).toHaveCount(0);
});

test("invalid persisted preferences recover to a usable reader", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem("baodium-book-reader", JSON.stringify({ theme: "bad", fontScale: [], measure: {}, progressBySlug: null, scrollTops: "bad" }));
    localStorage.setItem("baodium-experience-ch1-v2", JSON.stringify({ stepId: "missing", mode: "bad", completed: "true" }));
  });
  await page.goto("/system-design/chapter-1");
  await expect(page.locator("#main")).toBeVisible();
  await page.goto("/system-design/experience/chapter-1");
  await expect(page.locator("#main")).toBeVisible();
  expect(errors).toEqual([]);
});

test("cascade mode changes and reset restore the correct simulation clock", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/sre-labs/cascade");
  const clock = page.locator(".cascade-clock");
  await expect(clock).toContainText("t 0.0s");
  await page.getByRole("button", { name: "Step 0.5s", exact: true }).click();
  await expect(clock).toContainText("t 0.5s");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(clock).toContainText("t 0.0s");
  await page.getByRole("button", { name: "Challenge", exact: true }).click();
  await expect(clock).toContainText("t 5.0s");
  await page.getByRole("button", { name: "Step 0.5s", exact: true }).click();
  await expect(clock).toContainText("t 5.5s");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(clock).toContainText("t 5.0s");
  await page.getByRole("button", { name: "Guided", exact: true }).click();
  await expect(clock).toContainText("t 0.0s");
  expect(errors).toEqual([]);
});

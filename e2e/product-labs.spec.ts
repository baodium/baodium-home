import { expect, test, type Page } from "@playwright/test";
import { PAGINATE_FIX, PRICING_FIX } from "./fixtures/product-fixes";

async function deploy(page: Page, source: string) {
  await page.getByRole("tab", { name: "Code" }).click();
  await page.locator(".pl-editor .cm-content").click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.insertText(source);
  await page.getByRole("button", { name: "Deploy" }).click();
  await expect(page.getByText(/Release .* is live/)).toBeVisible({ timeout: 20_000 });
}

test("the Labs hub leads with the three products", async ({ page }) => {
  await page.goto("/labs");
  const products = page.getByRole("region", { name: "Products" });
  for (const name of ["Larder", "Northlight", "Porch"]) {
    await expect(products.getByRole("heading", { level: 3, name })).toBeVisible();
  }
  await products.getByRole("link", { name: "Open Porch" }).click();
  await expect(page).toHaveURL(/\/sre-labs\/porch\/signin$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Some neighbors are sent back to sign-in");
});

test("Larder: a failed checkout recovers after the pricing fix ships", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/sre-labs/larder/checkout-errors");
  await page.getByRole("button", { name: /Cart, 2 items/ }).click();
  await page.getByRole("button", { name: "Check out" }).click();
  await page.getByRole("button", { name: "Pay $29.24" }).click();
  const alert = page.getByRole("alert").filter({ hasText: "We couldn’t take payment" });
  await expect(alert).toBeVisible();

  const reference = (await alert.locator("code").textContent())!.trim();
  await page.getByRole("tab", { name: "Logs" }).click();
  await page.getByPlaceholder(/Search words/).fill(reference);
  await expect(page.locator(".pl-loglines li").filter({ hasText: "expected_cents=2925" })).toBeVisible();

  await page.getByRole("tab", { name: "Code" }).click();
  await page.getByRole("button", { name: "Run tests" }).click();
  await expect(page.locator('.pl-tests li[data-passed="false"]').first()).toBeVisible();

  await deploy(page, PRICING_FIX);
  await page.getByRole("button", { name: "Pay $29.25" }).click();
  await expect(page.getByRole("heading", { name: /Your order is confirmed/ })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /Resolved at/ })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "What happened in Larder" })).toBeVisible();
});

test("Porch: a missing post appears once the cursor is fixed", async ({ page }) => {
  await page.goto("/sre-labs/porch/missing-posts");
  const feed = page.getByRole("list", { name: "Home feed" });
  const readAll = async () => {
    const caughtUp = page.getByText(/You’re all caught up/);
    while (!(await caughtUp.isVisible())) {
      await page.getByRole("button", { name: "Show more posts" }).click();
      await expect(page.getByRole("button", { name: "Loading…" })).toHaveCount(0);
    }
  };
  await expect(feed.locator("> li")).toHaveCount(5);
  await readAll();
  await expect(feed.locator("> li")).toHaveCount(13);
  await expect(feed.getByText(/Our cat Biscuit/)).toHaveCount(0);

  await deploy(page, PAGINATE_FIX);
  await page.getByRole("button", { name: "Reload the page" }).click();
  await expect(feed.locator("> li")).toHaveCount(5);
  await readAll();
  await expect(feed.locator("> li")).toHaveCount(14);
  await expect(feed.getByText(/Our cat Biscuit/)).toBeVisible();
});

test("Porch: turning the auth canary off lets the learner sign in", async ({ page }) => {
  await page.goto("/sre-labs/porch/signin");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Your session ended" })).toBeVisible();
  await page.getByRole("tab", { name: "Releases and config" }).click();
  await page.getByRole("group", { name: "Auth 2.14.0 traffic" }).getByRole("button", { name: "0%", exact: true }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("list", { name: "Home feed" })).toBeVisible();
  await expect(page.locator(".pl-resolution li").filter({ hasText: "You sign in to Porch" })).toHaveAttribute("data-done", "true");
});

test("Northlight: the player reports what it is playing, and steering drains an edge", async ({ page }) => {
  await page.goto("/sre-labs/northlight/frankfurt");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("menuitemcheckbox", { name: /Playback stats/ }).click();
  const stats = page.getByLabel("Playback stats");
  await expect(stats).toContainText("3.8.1");
  await expect(stats).toContainText("Fiber, 25 Mbps");

  await page.getByRole("tab", { name: "Releases and config" }).click();
  const fra2 = page.locator("tr", { hasText: "fra-2" });
  await fra2.getByRole("button", { name: "Drain" }).click();
  await expect(fra2).toContainText("Drained");
  await expect(page.locator("tr", { hasText: "fra-1" })).toContainText("100%");
  await expect(page.locator(".pl-release-list li").filter({ hasText: "Drain fra-2" })).toBeVisible();
});

test("product labs fit a phone screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/labs", "/sre-labs/larder/checkout-errors", "/sre-labs/northlight/stalls", "/sre-labs/porch/missing-posts"]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), route).toBe(true);
  }
});

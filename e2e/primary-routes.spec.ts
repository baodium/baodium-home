import { expect, test } from "@playwright/test";

const primaryRoutes = [
  { path: "/", heading: /Baodium|Adewale|products/i },
  { path: "/system-design", heading: /System Design|Contents|Overview|Baodium/i },
  { path: "/system-design/experience", heading: /Labs|Experience|Chapter/i },
  { path: "/system-design/experience/chapter-1", heading: /Resource Contention|Chapter/i },
  { path: "/play", heading: /Drills|Play|SLO Watch/i },
  { path: "/play/slo-watch", heading: /SLO Watch|checkout/i },
  { path: "/play/traffic-surge", heading: /Traffic Surge|p95/i },
  { path: "/play/cascade", heading: /Cascade/i },
  { path: "/play/cache-roulette", heading: /Cache Roulette/i },
  { path: "/play/tail-latency", heading: /Tail Latency|p99/i },
  { path: "/projects", heading: /Projects|Interview Coach|UpTo/i },
  { path: "/about", heading: /Adewale|About|Baodium/i },
];

test.describe("primary routes", () => {
  for (const route of primaryRoutes) {
    test(`${route.path} loads`, async ({ page }) => {
      const res = await page.goto(route.path, { waitUntil: "domcontentloaded" });
      expect(res?.ok()).toBeTruthy();
      await expect(page.locator("#main")).toBeVisible();
      await expect(page.locator("h1").first()).toBeVisible();
      await expect(page.getByRole("link", { name: /skip to content/i })).toHaveCount(1);
    });
  }

  test("nav labels Home / Book / Labs / Drills / Projects / About", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Primary" });
    for (const label of ["Home", "Book", "Labs", "Drills", "Projects", "About"]) {
      await expect(nav.getByRole("link", { name: label })).toBeVisible();
    }
    await expect(
      page.locator("#top").getByRole("link", { name: /Read the book for free/i }),
    ).toBeVisible();
  });
});

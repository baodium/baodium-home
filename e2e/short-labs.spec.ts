import { expect, test } from "@playwright/test";

const labs = [
  { path: "/system-design/experience/chapter-2", heading: /size the workers/i },
  { path: "/system-design/experience/chapter-3", heading: /charge the card once/i },
  { path: "/system-design/experience/chapter-4", heading: /downstream work/i },
  { path: "/system-design/experience/chapter-5", heading: /keys expire/i },
  { path: "/system-design/experience/chapter-7", heading: /read your own write/i },
  { path: "/system-design/experience/chapter-12", heading: /backlog age/i },
  { path: "/system-design/experience/chapter-14", heading: /500 ms/i },
];

test.describe("short chapter labs", () => {
  for (const lab of labs) {
    test(`${lab.path} renders the system`, async ({ page }) => {
      const res = await page.goto(lab.path, { waitUntil: "domcontentloaded" });
      expect(res?.ok()).toBeTruthy();
      await expect(page.getByRole("heading", { level: 1 })).toContainText(lab.heading);
      await expect(page.locator(".react-flow")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Live metrics" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Your objective" })).toBeVisible();
    });
  }

  test("labs index lists the later chapters", async ({ page }) => {
    await page.goto("/system-design/experience");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/operate the chapter/i);
    await expect(page.getByRole("link", { name: /Replicas, Partitions, and Shards/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Event-Driven Systems/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Designing From Production Experience/i })).toBeVisible();
  });
});

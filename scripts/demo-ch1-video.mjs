import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT = "/cursor/stores/bc-425eb910-84c9-496e-82c4-4866fc10d80d/media/ch1-interactive";
const BASE = process.env.DEMO_BASE || "http://localhost:3000";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: OUT, size: { width: 1280, height: 800 } },
});
const page = await context.newPage();

await page.goto(`${BASE}/system-design/experience/chapter-1`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.getByRole("button", { name: "Sandbox" }).click();
await page.waitForTimeout(400);

// Show flag panel then pressure
await page.locator("h3", { hasText: "Feature flag" }).scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
await page.getByTestId("demo-pressure").click();

for (let i = 0; i < 30; i++) {
  const t = await page.locator("p").filter({ hasText: /\/40 busy/ }).first().textContent();
  if (t && /waiting/.test(t) && !/· 0 waiting/.test(t)) break;
  await page.waitForTimeout(200);
}

await page.locator("h3", { hasText: "Connection pool" }).scrollIntoViewIfNeeded();
await page.waitForTimeout(1200);
await page.locator("h3", { hasText: "Little" }).scrollIntoViewIfNeeded();
await page.waitForTimeout(900);
await page.getByRole("button", { name: /Disable for new traffic/i }).click();
await page.waitForTimeout(1800);
await page.locator("h3", { hasText: "Connection pool" }).scrollIntoViewIfNeeded();
await page.waitForTimeout(1200);

const video = page.video();
await context.close();
await browser.close();
const raw = await video.path();
const dest = path.join(OUT, "pool-rollout-demo.webm");
fs.renameSync(raw, dest);
console.log(dest, fs.statSync(dest).size);

/**
 * Headless demo capture for Chapter 1 experience.
 * Usage: node scripts/demo-ch1-screenshots.mjs
 */
import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT = "/cursor/stores/bc-425eb910-84c9-496e-82c4-4866fc10d80d/media/ch1-interactive";
const BASE = process.env.DEMO_BASE || "http://localhost:3000";

fs.mkdirSync(OUT, { recursive: true });

async function settle(page, ms = 600) {
  await page.waitForTimeout(ms);
}

async function readPoolHeader(page) {
  const el = page.locator("p").filter({ hasText: /\/40 busy/ }).first();
  if ((await el.count()) === 0) return null;
  return el.textContent();
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
  });
  const page = await desktop.newPage();

  await page.goto(`${BASE}/system-design`, { waitUntil: "networkidle" });
  await settle(page, 900);
  await page.getByRole("link", { name: /Operate this incident/i }).first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(OUT, "book-cta.png") });

  await page.goto(`${BASE}/system-design/experience`, { waitUntil: "networkidle" });
  await settle(page);
  await page.screenshot({ path: path.join(OUT, "hub-desktop.png"), fullPage: true });

  await page.goto(`${BASE}/system-design/experience/chapter-1`, {
    waitUntil: "networkidle",
  });
  await settle(page, 1000);
  await page.screenshot({ path: path.join(OUT, "desktop-guided-start.png") });

  await page.getByRole("button", { name: "Sandbox" }).click();
  await settle(page, 500);
  await page.getByTestId("demo-pressure").click();

  let waited = false;
  let last = "";
  for (let i = 0; i < 50; i++) {
    last = (await readPoolHeader(page)) || "";
    const m = last.match(/(\d+)\/40 busy · (\d+) waiting/i);
    if (m && Number(m[1]) <= 40 && Number(m[2]) > 0) {
      waited = true;
      console.log("pressure ok:", last);
      break;
    }
    await settle(page, 200);
  }
  if (!waited) console.warn("pressure not observed yet:", last);

  await page.locator("h3", { hasText: "Connection pool" }).scrollIntoViewIfNeeded();
  await settle(page, 300);
  await page.screenshot({ path: path.join(OUT, "desktop-pool-pressure.png") });
  await page.screenshot({
    path: path.join(OUT, "desktop-pool-pressure-full.png"),
    fullPage: true,
  });

  await page.locator("h3", { hasText: "Feature flag" }).scrollIntoViewIfNeeded();
  await settle(page, 200);
  await page.screenshot({ path: path.join(OUT, "desktop-rollout-flag.png") });

  await page.locator("h3", { hasText: "Little" }).scrollIntoViewIfNeeded();
  await settle(page, 200);
  await page.screenshot({ path: path.join(OUT, "desktop-littles-law.png") });

  // Disable for new traffic while under pressure
  await page.getByRole("button", { name: /Disable for new traffic/i }).click();
  await settle(page, 1500);
  await page.locator("h3", { hasText: "Connection pool" }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(OUT, "desktop-after-disable.png") });

  await desktop.close();

  const mobile = await browser.newContext({ ...devices["iPhone 13"] });
  const mpage = await mobile.newPage();
  await mpage.goto(`${BASE}/system-design/experience/chapter-1`, {
    waitUntil: "networkidle",
  });
  await settle(mpage, 900);
  await mpage.getByRole("button", { name: "Sandbox" }).click();
  await settle(mpage, 400);
  await mpage.getByTestId("demo-pressure").click();
  await settle(mpage, 2000);
  await mpage.screenshot({
    path: path.join(OUT, "mobile-experience.png"),
    fullPage: true,
  });

  await browser.close();
  const files = fs.readdirSync(OUT).sort();
  console.log(JSON.stringify({ out: OUT, waited, last, files }, null, 2));
  if (!waited) process.exitCode = 2;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

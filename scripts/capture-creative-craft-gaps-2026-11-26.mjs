import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT =
  process.env.DEMO_OUT ||
  "/Users/adewaleobadimu/Library/Application Support/Cursor/AgentStores/cursor_agent_stores/bc-425eb910-84c9-496e-82c4-4866fc10d80d/files/media/creative-craft-2026-11-26";
const BASE = process.env.DEMO_BASE || "http://127.0.0.1:3488";
fs.mkdirSync(OUT, { recursive: true });

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  console.log("wrote", file);
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  reducedMotion: "reduce",
});
const page = await ctx.newPage();

await page.goto(`${BASE}/sre-labs/api`, { waitUntil: "networkidle", timeout: 60000 });
await page.locator("h1").first().waitFor();
await page.waitForTimeout(700);
await shot(page, "sre-api-modes-single.png");

await page.getByRole("button", { name: "Practice", exact: true }).first().click();
await page.waitForTimeout(700);
await page.getByRole("button", { name: /Raise docs lag/i }).click();
await page.waitForTimeout(1800);
await page.evaluate(() => window.scrollBy(0, 420));
await page.waitForTimeout(400);
await shot(page, "sre-api-docs-lag-miss-line.png");

await page.evaluate(() => window.scrollTo(0, 0));
await page.getByRole("button", { name: "Challenge", exact: true }).first().click();
await page.waitForTimeout(1000);
await page.evaluate(() => window.scrollBy(0, 380));
await page.waitForTimeout(400);
await shot(page, "sre-api-challenge-latency-seed.png");

await page.goto(`${BASE}/sre-labs/analytics`, {
  waitUntil: "networkidle",
  timeout: 60000,
});
await page.locator("h1").first().waitFor();
await page.waitForTimeout(700);
await page.getByRole("button", { name: "Practice", exact: true }).first().click();
await page.waitForTimeout(900);
await shot(page, "sre-analytics-practice-late-batches.png");
const late = page.getByRole("button", { name: /^Late batches$/i });
if (await late.count()) {
  await late.first().click();
  await page.waitForTimeout(1600);
  await page.evaluate(() => window.scrollBy(0, 360));
  await page.waitForTimeout(400);
  await shot(page, "sre-analytics-practice-late-batches-run.png");
}

await browser.close();
console.log("done", OUT);

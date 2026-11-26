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
await page.waitForTimeout(800);
await shot(page, "sre-api-mast-compact.png");

await page.getByRole("button", { name: "Challenge", exact: true }).first().click();
await page.waitForTimeout(1100);
await page.evaluate(() => window.scrollBy(0, 420));
await page.waitForTimeout(400);
await shot(page, "sre-api-challenge-miss-scale.png");

await page.getByRole("button", { name: "Practice", exact: true }).first().click();
await page.waitForTimeout(700);
await page.getByRole("button", { name: /Raise docs lag/i }).click();
await page.waitForTimeout(1600);
await page.evaluate(() => window.scrollBy(0, 420));
await page.waitForTimeout(400);
await shot(page, "sre-api-docs-lag-full-miss-scale.png");

await page.goto(`${BASE}/sre-labs/coding`, {
  waitUntil: "networkidle",
  timeout: 60000,
});
await page.locator("h1").first().waitFor().catch(() => {});
await page.waitForTimeout(900);
await shot(page, "coding-roadmap-30.png");

await page.goto(
  `${BASE}/sre-labs/coding/status-counts-complete-v1?lang=typescript`,
  { waitUntil: "networkidle", timeout: 60000 },
);
await page.waitForTimeout(1200);
await shot(page, "coding-complete-status-counts-ts.png");

await page.goto(
  `${BASE}/sre-labs/coding/retry-backoff-debug-v1?lang=go`,
  { waitUntil: "networkidle", timeout: 60000 },
);
await page.waitForTimeout(1200);
await shot(page, "coding-debug-retry-backoff-go.png");

await page.goto(
  `${BASE}/sre-labs/coding/error-budget-complete-v1?lang=typescript`,
  { waitUntil: "networkidle", timeout: 60000 },
);
await page.waitForTimeout(1200);
await shot(page, "coding-complete-error-budget-ts.png");

await browser.close();
console.log("done", OUT);

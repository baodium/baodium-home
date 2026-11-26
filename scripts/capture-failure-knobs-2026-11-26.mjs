import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT =
  "/Users/adewaleobadimu/Library/Application Support/Cursor/AgentStores/cursor_agent_stores/bc-425eb910-84c9-496e-82c4-4866fc10d80d/files/media/creative-craft-2026-11-26";
const BASE = "http://127.0.0.1:3488";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  reducedMotion: "reduce",
});
const page = await ctx.newPage();

async function shot(name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  console.log("wrote", file);
}

await page.goto(`${BASE}/sre-labs/api`, { waitUntil: "networkidle", timeout: 60000 });
await page.locator("h1").first().waitFor();
await page.waitForTimeout(800);
await page.getByRole("button", { name: "Practice", exact: true }).first().click();
await page.waitForTimeout(900);
await shot("sre-api-practice.png");
await page.getByRole("button", { name: /Raise docs lag/i }).click();
await page.waitForTimeout(1800);
await page.evaluate(() => window.scrollBy(0, 420));
await page.waitForTimeout(400);
await shot("sre-api-docs-lag.png");
await page.evaluate(() => window.scrollTo(0, 0));
await page.getByRole("button", { name: /Introduce contract mismatches/i }).click();
await page.waitForTimeout(1800);
await page.evaluate(() => window.scrollBy(0, 420));
await page.waitForTimeout(400);
await shot("sre-api-contract-mismatch.png");

await page.goto(`${BASE}/sre-labs/analytics`, {
  waitUntil: "networkidle",
  timeout: 60000,
});
await page.locator("h1").first().waitFor();
await page.waitForTimeout(700);

for (let i = 0; i < 6; i += 1) {
  const late = page.getByRole("button", { name: /Raise late batches/i });
  if (await late.count()) {
    await late.click();
    await page.waitForTimeout(1600);
    await page.evaluate(() => window.scrollBy(0, 380));
    await shot("sre-analytics-late-batches.png");
    break;
  }
  const busy = page.getByRole("button", { name: /Run the busy warehouse/i });
  if (await busy.count()) {
    await busy.click();
    await page.waitForTimeout(1100);
    continue;
  }
  const fail = page
    .locator("button")
    .filter({ hasText: /fail|reject|spike|burn-rate|ingest/i });
  if (await fail.count()) {
    await fail.first().click();
    await page.waitForTimeout(1100);
    continue;
  }
  break;
}

await page.getByRole("button", { name: "Practice", exact: true }).first().click();
await page.waitForTimeout(900);
await shot("sre-analytics-practice.png");

await browser.close();
console.log("done");

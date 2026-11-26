import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT =
  process.env.DEMO_OUT ||
  "/Users/adewaleobadimu/Library/Application Support/Cursor/AgentStores/cursor_agent_stores/bc-425eb910-84c9-496e-82c4-4866fc10d80d/files/media/creative-craft-2026-11-26";
const BASE = process.env.DEMO_BASE || "http://127.0.0.1:3488";
fs.mkdirSync(OUT, { recursive: true });

async function settle(page, ms = 900) {
  await page.waitForTimeout(ms);
}

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  console.log("wrote", file);
}

async function waitReady(page, route) {
  await page.goto(`${BASE}${route}`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.locator("h1").first().waitFor({ timeout: 30000 });
  await settle(page, 1000);
}

const browser = await chromium.launch({ headless: true });
const desktop = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  reducedMotion: "reduce",
});
const page = await desktop.newPage();

await waitReady(page, "/sre-labs");
await shot(page, "sre-catalog-eight-surfaces.png");

await waitReady(page, "/sre-labs/api");
await shot(page, "sre-api-budget.png");

await waitReady(page, "/sre-labs/analytics");
await shot(page, "sre-analytics-ingest.png");

await waitReady(page, "/labs");
await shot(page, "labs-hub-eight-surfaces.png");

await waitReady(page, "/sre-labs/coding/status-counts?lang=typescript");
await settle(page, 1200);
await shot(page, "coding-impl-status-counts-ts.png");

await waitReady(page, "/sre-labs/coding/dependency-order?lang=go");
await settle(page, 1200);
await shot(page, "coding-impl-dependency-order-go.png");

await waitReady(page, "/sre-labs/coding/retry-backoff?lang=typescript");
await settle(page, 1200);
await shot(page, "coding-impl-retry-backoff-ts.png");

await desktop.close();
await browser.close();
console.log("done", OUT);

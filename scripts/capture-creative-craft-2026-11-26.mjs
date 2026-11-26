/**
 * Creative craft screenshots for 2026-11-26.
 * Usage: DEMO_BASE=http://localhost:3105 node scripts/capture-creative-craft-2026-11-26.mjs
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT =
  process.env.DEMO_OUT ||
  "/Users/adewaleobadimu/Library/Application Support/Cursor/AgentStores/cursor_agent_stores/bc-425eb910-84c9-496e-82c4-4866fc10d80d/files/media/creative-craft-2026-11-26";
const BASE = process.env.DEMO_BASE || "http://localhost:3105";

fs.mkdirSync(OUT, { recursive: true });

async function settle(page, ms = 800) {
  await page.waitForTimeout(ms);
}

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  console.log("wrote", file);
}

async function waitReady(page, route) {
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.locator("h1").first().waitFor({ timeout: 30000 });
  await settle(page, 900);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const page = await desktop.newPage();

  await waitReady(page, "/");
  await settle(page, 1800);
  await shot(page, "home-hero.png");

  await waitReady(page, "/play");
  await shot(page, "play-hub-air.png");

  await waitReady(page, "/play/tail-latency");
  await shot(page, "tail-latency-intro-desktop.png");

  const short = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const shortPage = await short.newPage();
  await waitReady(shortPage, "/play/tail-latency");
  await shot(shortPage, "tail-latency-intro-short.png");
  await short.close();

  await waitReady(page, "/sre-labs");
  await shot(page, "sre-catalog-mosaic.png");

  await waitReady(page, "/sre-labs/capacity");
  await shot(page, "sre-capacity-edge.png");

  await waitReady(page, "/labs");
  await shot(page, "labs-hub-surfaces.png");

  await waitReady(page, "/sre-labs/coding");
  await shot(page, "coding-roadmap-formats.png");

  await waitReady(page, "/sre-labs/coding/unhealthy-instances-v1?lang=typescript");
  await settle(page, 1200);
  await shot(page, "coding-implementation-ts.png");

  await waitReady(page, "/sre-labs/coding/deployment-audit-implementation-v1?lang=go");
  await settle(page, 1200);
  await shot(page, "coding-implementation-go-api.png");

  await desktop.close();
  await browser.close();
  console.log("done", OUT);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

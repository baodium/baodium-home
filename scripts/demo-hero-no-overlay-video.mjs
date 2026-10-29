import { chromium } from "playwright";
import { mkdirSync, copyFileSync } from "fs";

const out = "/opt/cursor/artifacts/hero-no-overlay";
const media =
  "/cursor/stores/bc-425eb910-84c9-496e-82c4-4866fc10d80d/media/hero-no-overlay";
mkdirSync(out, { recursive: true });
mkdirSync(media, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "reduce",
});

await page.goto("http://127.0.0.1:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(800);

await page.screenshot({ path: `${out}/recording-frame-hero.png` });

const path = `${out}/hero-no-overlay-demo.webm`;
await page.video?.delete?.();
await page.close();
await browser.close();

// Re-open with video recording
const browser2 = await chromium.launch({ headless: true });
const context = await browser2.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "reduce",
  recordVideo: { dir: out, size: { width: 1440, height: 900 } },
});
const page2 = await context.newPage();
await page2.goto("http://127.0.0.1:3000/", { waitUntil: "networkidle" });
await page2.waitForTimeout(1200);
await page2.evaluate(() =>
  window.scrollTo({ top: document.getElementById("live-path")?.offsetTop ?? 700, behavior: "instant" }),
);
await page2.waitForTimeout(1600);
await page2.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
await page2.waitForTimeout(900);
await context.close();
await browser2.close();

import { readdirSync, renameSync } from "fs";
import { join } from "path";
const vids = readdirSync(out).filter((n) => n.endsWith(".webm"));
if (vids[0]) {
  const src = join(out, vids[0]);
  const destOut = join(out, "hero-no-overlay-demo.webm");
  const destMedia = join(media, "hero-no-overlay-demo.webm");
  renameSync(src, destOut);
  copyFileSync(destOut, destMedia);
  console.log("video", destMedia);
} else {
  console.error("no video");
  process.exit(1);
}

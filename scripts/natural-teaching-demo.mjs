import { chromium } from "playwright";
import { mkdirSync, copyFileSync, readdirSync } from "fs";
import { join } from "path";

const out = "/opt/cursor/artifacts/natural-teaching-chrome";
const media =
  "/cursor/stores/bc-425eb910-84c9-496e-82c4-4866fc10d80d/media/natural-teaching-chrome";
mkdirSync(out, { recursive: true });
mkdirSync(media, { recursive: true });
const base = "http://127.0.0.1:3000";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(base + "/play", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/play-hub-prose.png`, fullPage: false });

await page.goto(base + "/play/tail-latency", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/tail-latency-prose.png`, fullPage: false });

await page.goto(base + "/system-design/experience/chapter-1", {
  waitUntil: "networkidle",
});
await page.waitForTimeout(1400);
await page.screenshot({ path: `${out}/ch1-lab-prose.png`, fullPage: false });

await page.goto(base + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(1600);
const play = page.locator("#play");
if (await play.count()) {
  await play.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
}
await page.screenshot({ path: `${out}/home-play-prose.png`, fullPage: false });

await browser.close();

for (const f of readdirSync(out).filter((n) => n.endsWith(".png"))) {
  copyFileSync(join(out, f), join(media, f));
}
console.log("copied to", media);

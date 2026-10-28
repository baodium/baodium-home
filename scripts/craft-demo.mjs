import { chromium } from "playwright";
import { mkdirSync, copyFileSync, readdirSync } from "fs";
import { join } from "path";

const out = "/opt/cursor/artifacts/human-pro-sim-craft";
const media = "/cursor/stores/self/media/human-pro-sim-craft";
mkdirSync(out, { recursive: true });
mkdirSync(media, { recursive: true });
const base = "http://127.0.0.1:3000";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(base + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(2400);
await page.screenshot({ path: `${out}/hero-sharp-roles.png`, fullPage: false });

await page.evaluate(() => window.scrollBy(0, 180));
await page.waitForTimeout(700);
await page.screenshot({ path: `${out}/hero-roles-after-scroll.png`, fullPage: false });

await page.locator("#book").scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/book-no-latency-figure.png`, fullPage: false });

await page.locator("#play").scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/home-play-training.png`, fullPage: false });

await page.goto(base + "/play", { waitUntil: "networkidle" });
await page.waitForTimeout(1100);
await page.screenshot({ path: `${out}/play-hub-training.png`, fullPage: false });

await page.goto(base + "/play/tail-latency", { waitUntil: "networkidle" });
await page.waitForTimeout(1100);
await page.screenshot({ path: `${out}/tail-latency-brief.png`, fullPage: false });

await page.goto(base + "/system-design/experience/chapter-1", { waitUntil: "networkidle" });
await page.waitForTimeout(1300);
await page.screenshot({ path: `${out}/ch1-training-brief.png`, fullPage: false });

await browser.close();

for (const f of readdirSync(out).filter((n) => n.endsWith(".png"))) {
  copyFileSync(join(out, f), join(media, f));
}
console.log("copied to", media);

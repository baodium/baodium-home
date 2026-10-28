import { chromium } from "playwright";
import { mkdirSync, copyFileSync, readdirSync } from "fs";
import { join } from "path";

const out = "/opt/cursor/artifacts/gradient-free-craft";
const media = "/cursor/stores/self/media/gradient-free-craft";
mkdirSync(out, { recursive: true });
mkdirSync(media, { recursive: true });
const base = "http://127.0.0.1:3000";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(base + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(2200);
await page.screenshot({ path: `${out}/hero-no-aurora.png`, fullPage: false });

await page.locator("#book").scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/book-solid-cta.png`, fullPage: false });

await page.locator("#play").scrollIntoViewIfNeeded();
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/home-play-flat.png`, fullPage: false });

await page.locator("#projects").scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/home-projects-flat.png`, fullPage: false });

await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/footer-no-blob.png`, fullPage: false });

await page.goto(base + "/play", { waitUntil: "networkidle" });
await page.waitForTimeout(1100);
await page.screenshot({ path: `${out}/play-hub-flat.png`, fullPage: false });

await page.goto(base + "/play/tail-latency", { waitUntil: "networkidle" });
await page.waitForTimeout(1100);
await page.screenshot({ path: `${out}/tail-latency-training.png`, fullPage: false });

await page.goto(base + "/system-design/experience/chapter-1", { waitUntil: "networkidle" });
await page.waitForTimeout(1300);
await page.screenshot({ path: `${out}/ch1-training-flat.png`, fullPage: false });

await page.goto(base + "/about", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/about-flat.png`, fullPage: false });

await browser.close();

for (const f of readdirSync(out).filter((n) => n.endsWith(".png"))) {
  copyFileSync(join(out, f), join(media, f));
}
console.log("copied to", media);

/**
 * Homepage craft-pass demos: desktop + mobile stills + short scroll video frames via screenshots.
 * Usage: DEMO_BASE=http://localhost:3000 node scripts/demo-homepage-craft.mjs
 */
import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT =
  process.env.DEMO_OUT ||
  "/cursor/stores/bc-425eb910-84c9-496e-82c4-4866fc10d80d/media/homepage-craft-pass";
const BASE = process.env.DEMO_BASE || "http://localhost:3000";

fs.mkdirSync(OUT, { recursive: true });

async function settle(page, ms = 700) {
  await page.waitForTimeout(ms);
}

async function shot(page, name, opts = {}) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, ...opts });
  console.log("wrote", file);
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const d = await desktop.newPage();
  await d.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await settle(d, 2200);
  await shot(d, "01-desktop-hero.png");

  await d.locator("#products").scrollIntoViewIfNeeded();
  await settle(d, 900);
  await shot(d, "02-desktop-products.png");

  await d.locator("#book").scrollIntoViewIfNeeded();
  await settle(d, 900);
  await shot(d, "03-desktop-book.png");

  await d.locator("#play").scrollIntoViewIfNeeded();
  await settle(d, 900);
  await shot(d, "04-desktop-play.png");

  await d.locator("#about").scrollIntoViewIfNeeded();
  await settle(d, 900);
  await shot(d, "05-desktop-about-also.png");

  await d.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await settle(d, 1100);
  await shot(d, "06-desktop-footer.png");

  // Motion strip: scroll through hero → products
  await d.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await settle(d, 1800);
  await shot(d, "07-motion-hero-rest.png");
  await d.evaluate(() => window.scrollBy(0, Math.round(window.innerHeight * 0.55)));
  await settle(d, 700);
  await shot(d, "08-motion-scroll-mid.png");
  await d.locator("#products").scrollIntoViewIfNeeded();
  await settle(d, 800);
  await shot(d, "09-motion-products-reveal.png");

  await desktop.close();

  const mobile = await browser.newContext({
    ...devices["iPhone 13"],
    viewport: { width: 390, height: 844 },
  });
  const m = await mobile.newPage();
  await m.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await settle(m, 2000);
  await shot(m, "10-mobile-hero.png");

  await m.locator("#products").scrollIntoViewIfNeeded();
  await settle(m, 800);
  await shot(m, "11-mobile-products.png");

  await m.locator("#book").scrollIntoViewIfNeeded();
  await settle(m, 800);
  await shot(m, "12-mobile-book.png");

  await m.locator("#about").scrollIntoViewIfNeeded();
  await settle(m, 800);
  await shot(m, "13-mobile-about-also.png");

  await m.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await settle(m, 1000);
  await shot(m, "14-mobile-footer.png");

  await mobile.close();
  await browser.close();
  console.log("done", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

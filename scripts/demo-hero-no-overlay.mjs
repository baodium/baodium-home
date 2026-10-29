import { chromium } from "playwright";
import { mkdirSync, copyFileSync, readdirSync } from "fs";
import { join } from "path";

const out = "/opt/cursor/artifacts/hero-no-overlay";
const media =
  "/cursor/stores/bc-425eb910-84c9-496e-82c4-4866fc10d80d/media/hero-no-overlay";
mkdirSync(out, { recursive: true });
mkdirSync(media, { recursive: true });
const base = "http://127.0.0.1:3000";

const browser = await chromium.launch({ headless: true });

async function shot(page, name, fullPage = false) {
  const path = `${out}/${name}.png`;
  await page.screenshot({ path, fullPage });
  console.log("shot", name);
}

{
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  await shot(page, "home-hero-no-overlay-1440");
  await page.locator("#live-path").scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await shot(page, "home-live-path-below-fold-1440");
  await page.close();
}

{
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await shot(page, "home-hero-mobile-390");
  await page.close();
}

{
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
  });
  for (const [path, name] of [
    ["/projects", "projects-1280"],
    ["/about", "about-1280"],
    ["/play", "play-hub-1280"],
    ["/system-design/experience", "labs-hub-1280"],
    ["/system-design/chapter-1", "reader-chapter-1-1280"],
  ]) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    await page.waitForTimeout(700);
    await shot(page, name);
  }
  await page.close();
}

await browser.close();

for (const f of readdirSync(out).filter((n) => n.endsWith(".png"))) {
  copyFileSync(join(out, f), join(media, f));
}
console.log("copied to", media);

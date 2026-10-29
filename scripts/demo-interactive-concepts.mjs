import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const MEDIA = "/cursor/stores/bc-425eb910-84c9-496e-82c4-4866fc10d80d/media/book-interactive-concept";
const ART = "/opt/cursor/artifacts";
const SHOTS = path.join(ART, "screenshots");
for (const dir of [MEDIA, ART, SHOTS]) fs.mkdirSync(dir, { recursive: true });

function copyBoth(name, buf) {
  fs.writeFileSync(path.join(MEDIA, name), buf);
  fs.writeFileSync(path.join(SHOTS, name), buf);
  console.log("saved", name);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: ART, size: { width: 1440, height: 900 } },
});
const page = await context.newPage();

await page.goto("http://127.0.0.1:3000/system-design/chapter-1", {
  waitUntil: "networkidle",
});
await page.waitForSelector(".book-interactive-concept", { timeout: 15000 });

// Scroll first concept into view
const first = page.locator(".book-interactive-concept").first();
await first.scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
copyBoth("ch1-interactive-concept.png", await page.screenshot({ fullPage: false }));

// Collapse TOC
const collapse = page.getByRole("button", { name: /Collapse table of contents/i });
if (await collapse.count()) {
  await collapse.click();
  await page.waitForTimeout(350);
  copyBoth("toc-collapsed.png", await page.screenshot({ fullPage: false }));
  // expand again for nicer reading shot later
  await page.getByRole("button", { name: /Expand table of contents/i }).click();
}

// Open search
await page.keyboard.press("Control+k");
await page.waitForTimeout(300);
if (await page.getByRole("dialog", { name: /Search book/i }).count()) {
  copyBoth("book-search.png", await page.screenshot({ fullPage: false }));
  await page.keyboard.press("Escape");
}

// Follow lab link with return params
const labLink = page
  .locator(".book-interactive-concept a[href*='experience/chapter-1']")
  .first();
await labLink.scrollIntoViewIfNeeded();
await labLink.click();
await page.waitForURL(/from=book/, { timeout: 15000 });
await page.waitForSelector("text=Return to chapter", { timeout: 15000 });
await page.waitForTimeout(500);
copyBoth("return-to-reading.png", await page.screenshot({ fullPage: false }));

await page.getByRole("link", { name: /Return to chapter/i }).click();
await page.waitForURL(/system-design\/chapter-1/, { timeout: 15000 });
await page.waitForTimeout(600);

const videoPath = await page.video()?.path();
await context.close();
await browser.close();

if (videoPath && fs.existsSync(videoPath)) {
  const destMedia = path.join(MEDIA, "book-interactive-concept-demo.mp4");
  const destArt = path.join(ART, "book-interactive-concept-demo.mp4");
  fs.copyFileSync(videoPath, destMedia);
  fs.copyFileSync(videoPath, destArt);
  console.log("saved video", destMedia);
} else {
  console.warn("no video path");
}

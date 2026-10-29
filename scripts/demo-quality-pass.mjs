import { chromium } from "playwright";
import { mkdirSync, copyFileSync, readdirSync } from "fs";
import { join } from "path";

const out = "/opt/cursor/artifacts/redesign-quality-pass";
const media = "/cursor/stores/bc-425eb910-84c9-496e-82c4-4866fc10d80d/media/redesign-quality-pass";
mkdirSync(out, { recursive: true });
mkdirSync(media, { recursive: true });
const base = "http://127.0.0.1:3000";

const browser = await chromium.launch({ headless: true });

async function shot(page, name) {
  const path = `${out}/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log("shot", name);
}

// Desktop home + nav
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await shot(page, "home-1440");
  await page.close();
}

// Mobile home
{
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: /Open menu/i }).click();
  await page.waitForTimeout(400);
  await shot(page, "home-mobile-nav-375");
  await page.close();
}

// Ch1 guided + controls
{
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
  });
  await page.goto(base + "/system-design/experience/chapter-1", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await shot(page, "ch1-guided-1280");
  await page.close();
}

// Drill pause/reset (force motion so Pause shows)
{
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "no-preference",
  });
  await page.goto(base + "/play/slo-watch", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  const step = page.getByRole("checkbox", { name: /Step mode/i });
  if (await step.isChecked()) await step.click();
  await page.getByRole("button", { name: /Start drill/i }).click();
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "Pause drill" }).click();
  await page.waitForTimeout(300);
  await shot(page, "slo-watch-paused");
  await page.getByRole("button", { name: "Reset drill" }).click();
  await page.waitForTimeout(300);
  await shot(page, "slo-watch-reset");
  await page.close();
}

// Responsive strip
for (const w of [375, 768, 1280, 1440]) {
  const page = await browser.newPage({ viewport: { width: w, height: w < 800 ? 812 : 900 } });
  await page.goto(base + "/play", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await shot(page, `drills-hub-${w}`);
  await page.close();
}

// Book drawer inert context
{
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto(base + "/system-design/chapter-1", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await shot(page, "book-chapter-mobile-375");
  await page.close();
}

await browser.close();

for (const f of readdirSync(out).filter((n) => n.endsWith(".png"))) {
  copyFileSync(join(out, f), join(media, f));
}
console.log("copied to", media);

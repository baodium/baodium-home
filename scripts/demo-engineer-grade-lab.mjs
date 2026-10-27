import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.DEMO_BASE || "http://localhost:3010";
const OUT = process.env.DEMO_OUT || "/cursor/stores/self/media/engineer-grade-lab";

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 920 },
  deviceScaleFactor: 1,
});

async function shot(name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  console.log("wrote", file);
}

await page.goto(`${BASE}/system-design/experience/chapter-1`, {
  waitUntil: "networkidle",
});
await page.waitForTimeout(600);
await shot("01-guided-start.png");

// Advance through early steps quickly
await page.getByRole("button", { name: "Toggle page preview" }).click();
await page.waitForTimeout(200);
await page.getByRole("button", { name: "Continue" }).click();
await page.waitForTimeout(200);
await page.getByRole("button", { name: "Deploy at 0% exposure" }).click();
await page.waitForTimeout(400);
await shot("02-deploy-zero-ops-teach.png");
await page.getByRole("button", { name: "Continue" }).click();
await page.waitForTimeout(200);
await page.getByRole("button", { name: "Send one request" }).click();
await page.waitForTimeout(800);
await page.getByRole("button", { name: "Continue" }).click();
await page.waitForTimeout(200);

// Rollout prediction + 25%
const pred = page.getByRole("button", { name: /made my prediction/i });
await pred.waitFor({ state: "visible", timeout: 5000 });
await pred.click();
await page.waitForTimeout(300);
const set25 = page.getByRole("button", { name: "Set 25%" });
await set25.waitFor({ state: "visible" });
await set25.click({ force: true });
await page.waitForTimeout(900);
await shot("03-rollout-prediction-outcome.png");
await page.getByRole("button", { name: "Continue" }).click();
await page.waitForTimeout(500);
// Scroll ops into view on inspect_prod
await page.evaluate(() => {
  const all = [...document.querySelectorAll("h3")];
  all.find((h) => h.textContent?.includes("Ops metrics"))?.scrollIntoView({
    block: "center",
  });
});
await page.waitForTimeout(400);
await shot("04-inspect-prod-ops-metrics.png");

// Jump to sandbox for pressure + mitigations
await page.getByRole("button", { name: "Sandbox" }).click();
await page.waitForTimeout(400);

// Record pressure → shed
const videoPage = await browser.newPage({
  viewport: { width: 1440, height: 920 },
  recordVideo: { dir: OUT, size: { width: 1440, height: 920 } },
});
await videoPage.goto(`${BASE}/system-design/experience/chapter-1`, {
  waitUntil: "networkidle",
});
await videoPage.getByRole("button", { name: "Sandbox" }).click();
await videoPage.waitForTimeout(400);
await videoPage.getByTestId("demo-pressure").click();
await videoPage.waitForTimeout(2200);
await videoPage.screenshot({
  path: path.join(OUT, "05-sandbox-pressure-ops.png"),
});
await videoPage.getByTestId("demo-shed").click();
await videoPage.waitForTimeout(2200);
await videoPage.screenshot({
  path: path.join(OUT, "06-sandbox-shed-armed.png"),
});
await videoPage.getByTestId("demo-timeout").click();
await videoPage.waitForTimeout(2200);
await videoPage.screenshot({
  path: path.join(OUT, "07-sandbox-timeouts.png"),
});
// Scroll mitigations into view
await videoPage.evaluate(() => {
  const el = document.querySelector("h3");
  const all = [...document.querySelectorAll("h3")];
  const m = all.find((h) => h.textContent?.includes("Mitigations"));
  m?.scrollIntoView({ block: "center" });
});
await videoPage.waitForTimeout(600);
await videoPage.screenshot({
  path: path.join(OUT, "08-mitigations-panel.png"),
});

const vid = videoPage.video();
await videoPage.close();
const raw = await vid.path();
const { rename, copyFile } = await import("node:fs/promises");
const dest = path.join(OUT, "sandbox-pressure-mitigations.webm");
try {
  await rename(raw, dest);
} catch {
  await copyFile(raw, dest);
}
console.log("wrote", dest);

// Mobile teaching
const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
await mobile.goto(`${BASE}/system-design/experience/chapter-1`, {
  waitUntil: "networkidle",
});
await mobile.getByRole("button", { name: "Sandbox" }).click();
await mobile.waitForTimeout(300);
await mobile.getByTestId("demo-pressure").click();
await mobile.waitForTimeout(1800);
await mobile.screenshot({
  path: path.join(OUT, "09-mobile-ops-pressure.png"),
});
console.log("wrote mobile");

await browser.close();
console.log("done");

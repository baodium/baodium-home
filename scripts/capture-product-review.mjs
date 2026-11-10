import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3102";
const out = path.resolve(process.env.REVIEW_OUTPUT || "docs/review");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const report = [];
for (const width of [375, 390, 768, 1024, 1440, 1920]) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
  for (const [name, route] of [["home", "/"], ["catalog", "/sre-labs"], ["course", "/sre-labs/observability"], ["course-lesson", "/sre-labs/observability/traces"], ["cascade", "/sre-labs/cascade"], ["capacity", "/sre-labs/capacity"], ["deployment", "/sre-labs/deployment"]]) {
    await page.goto(baseURL + route);
    await page.locator("h1").waitFor();
    if (route === "/") await page.waitForTimeout(2400);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    if (overflow) throw new Error(`Horizontal overflow on ${route} at ${width}`);
    report.push({ route, width, horizontalOverflow: overflow });
    if ([390, 1440].includes(width)) await page.screenshot({ path: path.join(out, `${name}-${width}.png`) });
  }
  await page.close();
}
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
await page.goto(baseURL + "/sre-labs/cascade");
for (const name of ["Run a healthy baseline", "Slow the provider, and keep the timeout long enough to cover it", "Shorten the timeout and allow four retries"]) await page.getByRole("button", { name, exact: true }).click();
await page.getByRole("button", { name: "Dark workspace", exact: true }).click();
await page.getByRole("tab", { name: "Traces", exact: true }).click();
await page.screenshot({ path: path.join(out, "incident-dark.png"), fullPage: true });
await page.getByRole("tab", { name: "Metrics", exact: true }).click();
for (const name of ["Cap retries, and release the slot on timeout", "Wait long enough for the provider work", "Check this run"]) await page.getByRole("button", { name, exact: true }).click();
await page.screenshot({ path: path.join(out, "recovered-dark.png"), fullPage: true });
await page.goto(baseURL + "/sre-labs/capacity");
await page.getByRole("button", { name: "Introduce traffic surge", exact: true }).click();
await page.getByRole("button", { name: "Step 5s", exact: true }).click();
await page.getByRole("button", { name: "Autoscaling Off", exact: true }).click();
for (let index=0; index<6; index++) await page.getByRole("button", { name: "Step 5s", exact: true }).click();
await page.getByRole("button", { name: "Assess recovery", exact: true }).click();
await page.screenshot({ path: path.join(out, "capacity-recovered.png"), fullPage: true });
writeFileSync(path.join(out, "responsive-checks.json"), JSON.stringify(report, null, 2) + "\n");
await browser.close();
console.log(`Captured product states and verified ${report.length} route/viewport combinations.`);

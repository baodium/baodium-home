import { chromium } from "playwright";
import { mkdirSync, copyFileSync, existsSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";

const out = "/opt/cursor/artifacts/redesign-quality-pass";
const media = "/cursor/stores/bc-425eb910-84c9-496e-82c4-4866fc10d80d/media/redesign-quality-pass";
mkdirSync(out, { recursive: true });
mkdirSync(media, { recursive: true });
const base = "http://127.0.0.1:3000";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  reducedMotion: "no-preference",
  recordVideo: { dir: out, size: { width: 1280, height: 800 } },
});
const page = await context.newPage();

await page.goto(base + "/play/slo-watch", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const step = page.getByRole("checkbox", { name: /Step mode/i });
if (await step.isChecked()) await step.click();
await page.getByRole("button", { name: /Start drill/i }).click();
await page.waitForTimeout(900);
await page.getByRole("button", { name: "Pause drill" }).click();
await page.waitForTimeout(700);
await page.getByRole("button", { name: "Resume drill" }).click();
await page.waitForTimeout(700);
await page.getByRole("button", { name: "Reset drill" }).click();
await page.waitForTimeout(600);

await page.goto(base + "/system-design/experience/chapter-1", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
const playPause = page.getByRole("button", { name: /Play simulation|Pause simulation/ });
await playPause.click();
await page.waitForTimeout(500);
await playPause.click();
await page.waitForTimeout(400);
await page.getByRole("button", { name: "Replay from start" }).click();
await page.waitForTimeout(800);

await page.goto(base + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(900);
await page.setViewportSize({ width: 375, height: 812 });
await page.waitForTimeout(400);
await page.getByRole("button", { name: /Open menu/i }).click();
await page.waitForTimeout(800);

await context.close();
await browser.close();

// find the webm
import { readdirSync, renameSync } from "fs";
const vids = readdirSync(out).filter((f) => f.endsWith(".webm"));
if (!vids.length) throw new Error("no webm");
const src = join(out, vids[0]);
const webm = join(out, "redesign-quality-pass-demo.webm");
const mp4 = join(out, "redesign-quality-pass-demo.mp4");
renameSync(src, webm);

const ff = spawnSync(
  "ffmpeg",
  ["-y", "-i", webm, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4],
  { encoding: "utf8" },
);
if (ff.status !== 0) {
  console.error(ff.stderr);
  // keep webm
} else {
  copyFileSync(mp4, join(media, "redesign-quality-pass-demo.mp4"));
}
copyFileSync(webm, join(media, "redesign-quality-pass-demo.webm"));
console.log("demo video ready");

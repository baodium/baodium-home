import { expect, test } from "@playwright/test";
import problems from "../src/lib/labs/coding-problems.json";

test("labs domain serves the hub while the main homepage stays separate", async ({
  request,
}) => {
  const hub = await request.get("/", { headers: { host: "labs.baodium.com" } });
  expect(hub.ok()).toBe(true);
  expect(await hub.text()).toContain("Build the instincts.");
  const redirect = await request.get("/sre-labs/coding", {
    headers: { host: "baodium.com" },
    maxRedirects: 0,
  });
  expect(redirect.status()).toBe(308);
  expect(redirect.headers().location).toBe(
    "https://labs.baodium.com/sre-labs/coding",
  );
  const home = await request.get("/");
  expect(await home.text()).toContain("Read the book for free");
});

test("coding roadmap filters and links to real exercises", async ({ page }) => {
  await page.goto("/sre-labs/coding");
  await expect(page.locator(".coding-roadmap-group li")).toHaveCount(24);
  await page.getByLabel("Find an exercise").fill("token");
  await expect(page.locator(".coding-roadmap-group li")).toHaveCount(1);
  await page.getByRole("link", { name: /Implement a token bucket/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Implement a token bucket",
  );
});

test("real Python executes examples and full checks, saves drafts and reports edits", async ({
  page,
}) => {
  test.setTimeout(120000);
  const problem = problems.find((problem) => problem.id === "status-counts")!;
  await page.goto("/sre-labs/coding/status-counts");
  await page.getByRole("button", { name: "Use plain text editor" }).click();
  await page
    .getByRole("textbox", { name: "Python solution editor" })
    .fill(problem.solution);
  await page.getByRole("button", { name: "Run examples", exact: true }).click();
  await expect(
    page.getByText("2 / 2 checks passed", { exact: true }),
  ).toBeVisible({ timeout: 60000 });
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("baodium-coding-progress-v1") || "{}")[
          "status-counts"
        ].status,
    ),
  ).toBe("attempted");
  await page.getByRole("button", { name: "Run all checks" }).click();
  await expect(
    page.getByText("3 / 3 checks passed · Full suite passed", { exact: true }),
  ).toBeVisible({ timeout: 60000 });
  await page
    .getByRole("textbox", { name: "Python solution editor" })
    .fill(problem.solution + "\n# revision");
  await expect(
    page.getByText("Code changed since this run.", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Use plain text editor" }).click();
  await expect(
    page.getByRole("textbox", { name: "Python solution editor" }),
  ).toHaveValue(problem.solution + "\n# revision");
  await page.getByRole("button", { name: "Reset starter" }).click();
  await page.getByRole("button", { name: "Keep draft" }).click();
  await expect(
    page.getByRole("textbox", { name: "Python solution editor" }),
  ).toHaveValue(problem.solution + "\n# revision");
  await page.getByRole("button", { name: "Reset starter" }).click();
  await page.getByRole("button", { name: "Replace draft" }).click();
  await expect(
    page.getByRole("textbox", { name: "Python solution editor" }),
  ).toHaveValue(problem.starter);
  await page.goto("/sre-labs/coding");
  await page.getByLabel("Progress", { exact: true }).selectOption("Passed");
  await expect(page.locator(".coding-roadmap-group li")).toHaveCount(1);
});

test("runtime errors and infinite loops recover without freezing the page", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/sre-labs/coding/status-counts");
  await page.getByRole("button", { name: "Use plain text editor" }).click();
  const editor = page.getByRole("textbox", { name: "Python solution editor" });
  await editor.fill(
    "def count_statuses(records):\n    raise ValueError('inspect the contract')",
  );
  await page.getByRole("button", { name: "Run all checks" }).click();
  await expect(
    page.getByText("0 / 3 checks passed", { exact: true }),
  ).toBeVisible({ timeout: 60000 });
  await editor.fill(
    "def count_statuses(records):\n    while True:\n        pass",
  );
  await page.getByRole("button", { name: "Run all checks" }).click();
  await expect(
    page.locator(".coding-results").getByRole("alert"),
  ).toContainText("Execution stopped after 3 seconds", { timeout: 60000 });
  await expect(
    page.getByRole("button", { name: "Run all checks" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Run all checks" }).click();
  await page.getByRole("button", { name: "Stop run" }).click();
  await expect(
    page.locator(".coding-results").getByRole("alert"),
  ).toContainText("Run cancelled");
});

test("new learning pages fit mobile and remain usable with blocked storage", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, "getItem", {
      value() {
        throw new Error("blocked");
      },
    });
    Object.defineProperty(Storage.prototype, "setItem", {
      value() {
        throw new Error("blocked");
      },
    });
  });
  for (const route of [
    "/labs",
    "/sre-labs/coding",
    "/sre-labs/coding/token-bucket",
  ]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
    ).toBe(false);
  }
  await page.getByRole("button", { name: "Use plain text editor" }).click();
  await page
    .getByRole("textbox", { name: "Python solution editor" })
    .fill("# saved in session fallback");
  await expect(
    page.getByRole("button", { name: "Run all checks" }),
  ).toBeEnabled();
});

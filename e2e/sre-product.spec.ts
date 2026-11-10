import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

test("homepage preserves the portrait introduction and direct reading links", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("region", { name: "Introduction" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Read the book for free", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Chapter 1 lab", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight <= innerHeight + 1,
    ),
  ).toBe(true);
  await expect(
    page.getByText("Understand the systems.", { exact: false }),
  ).toHaveCount(0);
});

test("SRE catalog filters intersect and an empty result can be cleared", async ({
  page,
}) => {
  await page.goto("/sre-labs");
  await expect(page.locator(".catalog-lesson")).toHaveCount(6);
  await page.getByLabel("Topic", { exact: true }).selectOption("Capacity");
  await expect(page.locator(".catalog-lesson")).toHaveCount(1);
  await page.getByLabel("Difficulty", { exact: true }).selectOption("Beginner");
  await expect(page.getByText("No labs match these filters.")).toBeVisible();
  await page.getByRole("button", { name: "Show all labs" }).click();
  await expect(page.locator(".catalog-lesson")).toHaveCount(6);
  await page
    .getByLabel("Prerequisites", { exact: true })
    .selectOption("No prerequisites");
  await expect(page.locator(".catalog-lesson")).toHaveCount(1);
  await expect(page.locator(".catalog-lesson")).toContainText(
    "Instrument a service",
  );
});

test("guided cascade recovers, replays the same evidence and records assessed completion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/sre-labs/cascade");
  for (const action of [
    "Run a healthy baseline",
    "Slow the provider, and keep the timeout long enough to cover it",
    "Shorten the timeout and allow four retries",
    "Cap retries, and release the slot on timeout",
    "Wait long enough for the provider work",
  ]) {
    await page.getByRole("button", { name: action, exact: true }).click();
  }
  const figures = await page.locator(".cascade-figures").textContent();
  const time = await page.locator(".cascade-clock").textContent();
  await page
    .getByRole("button", { name: "Replay experiment", exact: true })
    .click();
  await expect(page.locator(".cascade-figures")).toHaveText(figures ?? "");
  await expect(page.locator(".cascade-clock")).toHaveText(time ?? "");
  await page
    .getByRole("button", { name: "Check this run", exact: true })
    .click();
  await expect(page.locator(".cascade-result")).toContainText(
    "Completion saved",
  );
  await expect(
    page.getByRole("region", { name: "Incident review" }),
  ).toBeVisible();
  await page.goto("/sre-labs");
  await expect(page.locator(".catalog-progress")).toContainText("1 of 6");
});

for (const kind of ["capacity", "deployment"] as const) {
  test(`${kind} completes a recovery and replay on a narrow screen`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/sre-labs/${kind}`);
    await page
      .getByRole("button", {
        name:
          kind === "capacity"
            ? "Introduce traffic surge"
            : "Deploy canary to 50%",
        exact: true,
      })
      .click();
    await page.getByRole("button", { name: "Step 5s", exact: true }).click();
    await page.getByRole("button", { name: "Step 5s", exact: true }).click();
    await page
      .getByRole("button", { name: "Assess recovery", exact: true })
      .click();
    await expect(page.locator(".ops-verdict")).not.toHaveClass(/is-ok/);
    if (kind === "capacity") {
      await page.getByRole("button", { name: "policy", exact: true }).click();
      await page
        .getByRole("button", { name: "Autoscaling Off", exact: true })
        .click();
      await page.getByRole("button", { name: "system", exact: true }).click();
    } else {
      await page.getByRole("button", { name: "policy", exact: true }).click();
      await page
        .getByRole("button", { name: "Roll back to stable", exact: true })
        .click();
      await page.getByRole("button", { name: "system", exact: true }).click();
    }
    for (let index = 0; index < (kind === "capacity" ? 6 : 1); index++)
      await page.getByRole("button", { name: "Step 5s", exact: true }).click();
    const metrics = await page.locator(".ops-metrics").textContent();
    await page.getByRole("button", { name: "Replay", exact: true }).click();
    await expect(page.locator(".ops-metrics")).toHaveText(metrics ?? "");
    await page
      .getByRole("button", { name: "Assess recovery", exact: true })
      .click();
    await expect(page.locator(".ops-verdict")).toHaveClass(/is-ok/);
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(page.getByLabel("Simulation clock")).toHaveText(
      "0s · seed 42",
    );
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    );
    expect(overflow).toBe(false);
  });
}

test("alert rule rejects invalid config and responds to failure and missing measurements", async ({
  page,
}) => {
  await page.goto("/sre-labs/alert");
  await page.getByRole("button", { name: "Practice", exact: true }).click();
  const workbench = page.getByRole("region", {
    name: "Test an alert before it pages.",
  });
  await workbench
    .getByLabel("Rule configuration (JSON)")
    .fill('{"signal":"cpu","threshold":80,"forSeconds":5}');
  await workbench
    .getByRole("button", { name: "Apply rule", exact: true })
    .click();
  await expect(workbench.getByRole("alert")).toContainText("at most 1");
  await workbench
    .getByLabel("Rule configuration (JSON)")
    .fill('{"signal":"burn","threshold":14.4,"forSeconds":5}');
  await workbench
    .getByRole("button", { name: "Apply rule", exact: true })
    .click();
  await workbench
    .getByRole("button", { name: "Sustained failure", exact: true })
    .click();
  await expect(workbench.locator(".rule-result")).toContainText("paging");
  await workbench
    .getByRole("button", { name: "Missing metrics", exact: true })
    .click();
  await expect(workbench.locator(".rule-result")).toContainText("no-data");
});

test("mobile reference workspace exposes controls and evidence with keyboard topology controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sre-labs/cascade");
  await page
    .getByRole("button", { name: "Zoom in topology", exact: true })
    .click();
  await expect(page.getByLabel("Topology zoom")).toHaveText("125%");
  await page.getByRole("button", { name: "Fit view", exact: true }).click();
  await expect(page.getByLabel("Topology zoom")).toHaveText("100%");
  await page.getByRole("button", { name: "controls", exact: true }).click();
  await expect(page.getByRole("slider", { name: /Retry limit/ })).toBeVisible();
  await page.getByRole("button", { name: "evidence", exact: true }).click();
  await page.getByRole("tab", { name: "Metrics", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Traces", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
});

test("beginner instruments a trace, assesses it, then completes an SLO experiment", async ({
  page,
}) => {
  await page.goto("/sre-labs/instrument");
  await page.getByRole("button", { name: "Practice", exact: true }).click();
  for (const signal of [
    "HTTP metrics",
    "Outbound span",
    "Trace context",
    "Structured logs",
  ])
    await page
      .getByRole("button", { name: `${signal} off`, exact: true })
      .click();
  await page.getByRole("button", { name: "Run checkout", exact: true }).click();
  await page
    .getByRole("button", { name: "Payment charge", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Check this run", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Completion saved");
  await page
    .getByRole("navigation", { name: "SRE labs" })
    .getByRole("link", { name: "SLO", exact: true })
    .click();
  await expect(page).toHaveURL(/sre-labs\/slo$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("budget");
  await page.getByRole("button", { name: "Practice", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Practice", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Raise failures", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Check this run", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Completion saved");
  await page.goto("/sre-labs");
  await expect(page.locator(".catalog-progress")).toContainText("2 of 6");
});

test("book keeps the seven free chapters and the full-edition boundary", async ({
  page,
}) => {
  await page.goto("/system-design/chapter-7");
  await expect(page.getByRole("region", { name: "Full edition" })).toHaveCount(
    1,
  );
  await page.goto("/system-design/chapter-8");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "The rest of the book",
  );
  await expect(
    page.getByRole("link", { name: /Buy it on Amazon/ }),
  ).toBeVisible();
});

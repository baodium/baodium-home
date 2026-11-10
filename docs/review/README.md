# Product review evidence — November 10, 2026

Run `PLAYWRIGHT_BASE_URL=http://localhost:3102 node scripts/capture-product-review.mjs` against a running production build to refresh the screenshots and overflow checks. The script captures actual healthy, incident and recovered states. Screenshot review occurred in two passes; the final captures below reflect the refinement pass.

## Screenshots

- Homepage: [desktop](home-1440.png), [mobile](home-390.png).
- Six-lab curriculum: [desktop](catalog-1440.png), [mobile](catalog-390.png).
- Cascade workspace: [desktop](cascade-1440.png), [mobile](cascade-390.png), [active dark incident with traces](incident-dark.png), [recovered dark incident with assessment](recovered-dark.png).
- Capacity: [desktop](capacity-1440.png), [mobile](capacity-390.png), [assessed autoscaling recovery](capacity-recovered.png).
- Canary deployment: [desktop](deployment-1440.png), [mobile](deployment-390.png).

## Automated evidence

- `responsive-checks.json`: 30 route/viewport combinations, no horizontal document overflow.
- `accessibility.json`: axe WCAG A/AA tagged checks on seven routes × two widths, zero reported violations.
- `dark-accessibility.json`: active incident Metrics/Traces/Logs/Timeline tabs, zero reported violations.
- `performance.json`: eight local Chromium runs, split between desktop and a throttled mobile profile. These are lab measurements, not field data or field INP.
- Functional coverage: the repository's 48 Playwright tests and `npm run verify:sre-product`, alongside the existing simulation verification scripts.

## Provisional 100-point self-assessment

These are engineering/design review judgments, not an independent usability study. Visual/usability scores reflect inspected screenshots and tested interactions. Educational/accuracy scores reflect implemented objectives, documented assumptions and engine assertions. Accessibility/performance scores remain below full marks because field and screen-reader evidence is incomplete.

| Surface | Visual /20 | Usability /20 | Learning /20 | Accuracy /20 | Access/perf /10 | Implementation /10 | Total |
|---|---:|---:|---:|---:|---:|---:|---:|
| Homepage | 18 | 18 | 16 | 18 | 8 | 9 | 87 |
| Book overview/reader integration | 17 | 18 | 17 | 19 | 8 | 9 | 88 |
| SRE curriculum | 18 | 18 | 17 | 19 | 8 | 9 | 89 |
| Cascading checkout | 18 | 18 | 18 | 19 | 8 | 8 | 89 |
| Instrumentation | 16 | 17 | 17 | 18 | 8 | 9 | 85 |
| SLO | 16 | 17 | 18 | 19 | 8 | 9 | 87 |
| Alerting/rule experiment | 17 | 18 | 18 | 18 | 8 | 8 | 87 |
| Capacity/autoscaling | 17 | 18 | 18 | 18 | 8 | 9 | 88 |
| Canary deployment | 17 | 18 | 17 | 18 | 8 | 9 | 87 |

Existing projects, about, drills and other chapter laboratories were preserved and regression checked; they are not represented here as wholly redesigned products. Further work and simulation boundaries are recorded in [the implementation report](../product-redesign.md).

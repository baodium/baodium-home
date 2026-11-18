# Private visitor analytics

Open https://vercel.com/baodiumgmailcoms-projects/baodium-home/analytics while signed into the account that owns the project.

Vercel Web Analytics is enabled on this project. The root layout loads `@vercel/analytics/next` once, covering the homepage, Projects, book, labs and client-side page navigation. There is no public visitor counter or unauthenticated statistics API.

- Select a date range and the Production environment.
- **Visitors** is the provider's estimate of unique visitors, not an exact count of individual people. **Page views** counts page visits, including repeat views.
- Filter **Hostname** to distinguish `baodium.com` and `labs.baodium.com` within this shared project.
- Use Pages and Referrers to see the content people find and where visits originate.
- Collection begins after deployment of the integration; it does not recover historical traffic. Ad blockers and browser privacy settings can reduce counts.
- No custom events send learner source code, notebook text, or checkpoint file contents. Notebook drafts and imported reports stay in the learner's browser.
- Access is controlled by Vercel project/team membership. No plan upgrade was requested or performed; existing plan limits apply.

Provider setup: https://vercel.com/docs/analytics/quickstart
Dashboard filters: https://vercel.com/docs/analytics/using-web-analytics

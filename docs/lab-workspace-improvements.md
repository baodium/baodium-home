# SRE workspace and teaching improvements

The portrait homepage remains intact. SRE Labs is now a first-class destination beside Book and Projects in desktop/mobile homepage navigation and the shared site header.

## Execution model

Vercel serves the course pages. The recommended launch action opens GitHub Codespaces creation for this repository on main. `.devcontainer/devcontainer.json` provides Node 22, Docker-in-Docker, a four-core/eight-GB resource request, four labeled forwarded ports and a post-start task invoking the same CLI used locally. Learners create their own workspace; GitHub sign-in, available quota or billing, private forwarding and stop/delete instructions are disclosed before launch.

`node lab.mjs launch` validates prerequisites, builds the five-service stack, waits for container readiness and verifies real request counters, Grafana datasource connectivity and cross-framework trace/log correlation. It prints actual tool URLs (forwarded HTTPS in Codespaces), preserves existing experiment settings and records a baseline and session report. Stale startup reports are removed before retrying. Failed startup prints bounded diagnostics and leaves containers for inspection. `status` checks live readiness without generating traffic.

Local Docker is the tested fallback and remains downloadable. The archive is generated from source and checked byte-for-byte. Actual Codespaces provisioning has **not** been tested in a GitHub account; the configured provider path must not be described as an observed hosted end-to-end pass. No paid workspace was created during development.

Provider references: [forwarded ports](https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace), [GitHub's own Docker-in-Docker devcontainer](https://github.com/github/docs/blob/main/.devcontainer/devcontainer.json).

## Teaching design

All eight lessons now follow prediction → experiment → evidence → explanation → transfer. Before executing a procedure, learners predict outcomes. Afterward, a lesson-specific misconception and debrief rubric require concrete artifacts, causal reasoning and application to a different operational problem. System verification and learner interpretation remain distinct: a running stack does not certify a learner's explanation, arbitrary PromQL or custom dashboard panel.

## Validation

- Production build, TypeScript and ESLint.
- Real Docker launcher plus full fault/recovery integration: slow response, timeout 504, actual alert firing, healthy rolling-window recovery and rule reload.
- All 51 Playwright browser tests passed, including course navigation, source download, copy commands, mobile syllabus/hints, and desktop/mobile SRE navigation.
- WCAG Axe scan on five SRE/course routes at 390 and 1440 pixels.
- Dev Containers CLI 0.90.0 successfully built and started the exact Docker-in-Docker workspace locally. Its automatic post-start task passed the real baseline (metrics, Grafana and cross-service traces/logs). Actual Codespaces provisioning and hosted port forwarding await provider-side validation.

# Content provenance

What a reader sees, and where that text comes from. Labs are not a second manuscript.

## Author manuscript

The canonical source for this edition is `Practical_System_Design_Source_Lite.zip`, the Frontier Plus source Adewale uploaded on 2026-11-01. It is not committed. `scripts/convert-manuscript.mjs` looks for that name, then for the previous zip `Baodium_System_Design_Final_Language_Pass_Web.zip`, under `manuscript/`, the repo root, `/cursor/stores/self/source/`, and `MANUSCRIPT_ZIP`.

`manuscript/README.md` says to place the zip before a conversion. When the zip is absent and `src/generated/book/manifest.json` already exists, the converter keeps the committed output and does not invent chapters.

The zip contains `book.tex`, 14 chapter files, front matter, back matter, `final_image/` (PNG figures), and `BUILD_README.md`. Build notes in that file name the PDF `Practical_System_Design_Frontier_Plus_2026.pdf`. The previous committed book was converted from `Baodium_System_Design_Final_Language_Pass_Web.zip` on 2026-10-25.

## What is committed

`src/generated/book/*.json` is the rendered book the site serves. Pandoc and the Lua filters in `scripts/` produce the HTML. `scripts/enhance-book-html.mjs` highlights listings and math after that. Do not hand-edit those JSON files to change a sentence. Change the manuscript and reconvert.

The reader still has 14 chapters, the same slugs, plus preface, acknowledgements, epilogue, appendices A–C, worksheet, glossary, further reading, the concept guide, and about the author. Appendix B is not chapter 15.

Chapter titles in `src/lib/learning/registry.ts` and the short-lab catalog are copied from this manifest. A lab must not rename a chapter.

## What changed against the previous edition

Routes did not change. Two titles did:

- Chapter 5: “Caching and the Cost of Remembering” is now “Caching and Data Freshness”.
- Appendix B: “Three Classic Designs” is now “Four Practical System Designs”. The fourth design is a centralized change-validation platform. The URL shortener, social timeline, and notification service remain.

Chapter 1 and Chapter 2 are shorter. Chapters 3 through 14, the preface, Appendix B, and Appendix C were rewritten in place. Section headings moved with that prose. The 14 chapter titles other than Chapter 5 are unchanged.

Chapter 1 still opens on a product-page recommendation call, a feature flag, and a connection pool. The facts the lab has to follow are now these:

- Catalog stays on Product Page and does not take a pool slot.
- Each Recommendation instance allows 40 connections. The home page, checkout, and the new product-page calls share that pool.
- During the incident all 40 connections were assigned, about 80 acquisitions were pending, query time stayed near baseline, and acquire p99 was about 600 ms. Mean occupancy was about 70 ms.
- Turning the flag off stops new recommendation calls. Work already holding a connection still finishes or times out.
- The design that followed caps each Product Page instance at 16 in-flight recommendation calls and about 150 ms.

The manuscript does not publish a catalog latency in milliseconds. The lab still uses a short simulated catalog hold so the baseline path stays on the chart. That number is the simulation, not a quotation.

The concept guide in the source is a list of terms with chapter locators. The converter expands `\conceptentry` so those lines are in the reader. The previous edition’s concept guide was only the introductory paragraph.

## What the labs add

Chapter scenarios, drill copy, and short-lab situations are teaching written for the interactive pages. They are not quotes from the manuscript.

The Chapter 1 lab still operates the 40-connection incident (guided, practice, challenge). It names the shared callers and the incident readout. It does not replace that incident with a stub of the later 16-call admission limiter. Chapter 3 still teaches one charge when the provider answers after the client has given up. Chapter 5’s lab title follows “Caching and Data Freshness”. The cache-aside expiry lab is unchanged, because the chapter still teaches cache-aside, aligned expiry, and a shared fill.

Simulated metrics are labeled. SLO Watch is a browser model of pool size versus concurrency. It does not read a live SLO service.

Drill copy for Traffic Surge, Cascade, Cache Roulette, and Tail Latency is untouched. The five drill URLs are untouched.

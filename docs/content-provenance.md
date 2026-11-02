# Content provenance

What a reader sees, and where that text comes from. Labs are not a second manuscript.

## Author manuscript

The canonical source for this edition is `Practical_System_Design_Final_Edition_v5_Lite.zip`, uploaded on 2026-11-02. It replaces Frontier Plus (`Practical_System_Design_Source_Lite.zip`) as the reader and the labs. It is not committed. `scripts/convert-manuscript.mjs` looks for the v5 Lite zip first, then Frontier Plus, then `Baodium_System_Design_Final_Language_Pass_Web.zip`, under `manuscript/`, the repo root, `/cursor/stores/self/`, `/cursor/stores/self/source/`, and `MANUSCRIPT_ZIP`.

`manuscript/README.md` says to place the zip before a conversion. When the zip is absent and `src/generated/book/manifest.json` already exists, the converter keeps the committed output and does not invent chapters.

The zip contains `book.tex`, 14 chapter files, front matter, back matter, `final_image/` (PNG figures), and `BUILD_README.md`. Build notes in that file name the PDF `Practical_System_Design_Frontier_Plus_2026.pdf`. The previous committed book was converted from `Baodium_System_Design_Final_Language_Pass_Web.zip` on 2026-10-25.

## What is committed

`src/generated/book/*.json` is the rendered book the site serves. Pandoc and the Lua filters in `scripts/` produce the HTML. `scripts/enhance-book-html.mjs` highlights listings and math after that. Do not hand-edit those JSON files to change a sentence. Change the manuscript and reconvert.

The reader still has 14 chapters, the same slugs, plus preface, acknowledgements, epilogue, appendices A–C, worksheet, glossary, further reading, the concept guide, and about the author. Appendix B is not chapter 15.

Chapter titles in `src/lib/learning/registry.ts` and the short-lab catalog are copied from this manifest. A lab must not rename a chapter.

## Final Edition v5 Lite

The reader was reconverted from `Practical_System_Design_Final_Edition_v5_Lite.zip` on 2026-11-02. Chapter titles and the fourteen `/system-design/chapter-*` routes are unchanged. Figure files match the previous set. The prose in the reader is the manuscript prose, not a rewrite. The concept guide is the edition’s term list with chapter locators.

The Chapter 1 lab executes `get_product_page` and the body of `recommendation_service.get`: catalog does not take a slot, the flag is checked before the recommendation call, and that call acquires from the pool named in the listing (40 unless the reader edits it). Commenting out the call stops new pool acquires. The product page, graph, trace, and metrics read that same request.

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

The Chapter 1 lab still operates the 40-connection incident (guided, practice, challenge). It names the shared callers and the incident readout. It does not replace that incident with a stub of the later 16-call admission limiter. The visible response is the feature flag and exposure. Shed and a request-path cache are not offered as the incident response.

Chapter 2’s short lab compares building the payload before acquire with holding the connection while the payload is built. Traffic Surge places the admission limit on the last passing load-test stage, 400 lookups a second, where acquire p95 stays under 50 ms and rejections stay under 1 percent. Tail Latency keeps the query at 70 ms and moves acquire p95 with the lookup rate. Neither drill hedges requests or protects a VIP lane.

Chapter 3 still teaches one charge when the provider answers after the client has given up. The lab shows the manuscript POST and the unique index on one active authorization.

Chapter 4’s short lab and the Cascade drill run reserve_fraud_call: a child deadline, an outbound permit, and cancellation. They do not open circuit breakers on an auth service.

Chapter 5’s lab title follows “Caching and Data Freshness”. The short lab and Cache Roulette are one missed product-metadata:v1 key, one shared loader, and a source permit. They are not a multi-key stampede and not a soft TTL.

Chapter 7 routes the address that was just saved through choose_read_target. Chapter 12 claims the message, then commits the offset. Chapter 14 sizes the European Catalog pools from the chapter’s read rate and occupancy, including one instance down.

Simulated metrics are labeled. SLO Watch is a browser model of the 40-connection pool, the flag, and exposure. It does not read a live SLO service, and it does not reward a larger pool. The five drill URLs are unchanged.

# Content provenance

What a reader sees, and where that text comes from. Labs are not a second manuscript.

## Author manuscript

The canonical source is `Baodium_System_Design_Final_Language_Pass_Web.zip`. `scripts/convert-manuscript.mjs` looks for it under `manuscript/`, the repo root, and `MANUSCRIPT_ZIP`. The zip is not committed. `manuscript/README.md` says to place it before a conversion.

When the zip is absent and `src/generated/book/manifest.json` already exists, the converter keeps the committed output and does not invent chapters. That is the state of this checkout: the generated book is present, the zip is not.

## What is committed

`src/generated/book/*.json` is the rendered book the site serves. `src/generated/book/manifest.json` is the table of contents: 14 chapters, preface, epilogue, appendices A–C, worksheet, glossary, further reading, index, and about the author. Pandoc and the Lua filters in `scripts/` produce the HTML. Do not hand-edit those JSON files to “improve” a sentence. Change the manuscript and reconvert.

Chapter titles in the learning registry are copied from that manifest. Chapter 3 is “State, Identity, and the Cost of Uncertainty”. A lab must not rename it.

Appendix B is “Three Classic Designs”. It is an appendix. The plan does not turn it into chapter 15.

## What the labs add

Chapter scenarios, drill copy, and short-lab situations are teaching written for the interactive pages. They are original to the site. They are not quotes from the manuscript, and they are not a crawl of an older baodium.com.

Where a lab describes the Chapter 1 incident, it has to match the manuscript’s subject (resource contention, a recommendation call, a finite connection pool) and the engine’s boundary:

- Product Page → Catalog for the ordinary page
- Product Page → Recommendation → pool → database for an exposed user

Simulated metrics are labeled. The Chapter 1 ops strip says the figures are simulated and shaped like `pool.active`, `pool.pending`, acquire wait, and acquire timeouts. SLO Watch is a browser model of pool size versus concurrency. It does not read a live SLO service.

## What this change did not rewrite

The generated chapter HTML is untouched. Drill copy for Traffic Surge, Cascade, Cache Roulette, and Tail Latency is untouched. The five drill URLs are untouched.

#!/usr/bin/env node
/**
 * Build-time LaTeX → structured book content for the Baodium reader.
 * Canonical source: the newest author zip (not committed).
 * Practical_System_Design_Source_Lite.zip is the Frontier Plus edition.
 * Baodium_System_Design_Final_Language_Pass_Web.zip is the previous edition.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import {
  preprocessLatex,
  extractLabels,
  extractRefs,
  findUnknownMacros,
  loadFigureMacroExpansions,
} from "./preprocess-latex.mjs";

const ZIP_NAMES = [
  "Practical_System_Design_Source_Lite.zip",
  "Baodium_System_Design_Final_Language_Pass_Web.zip",
];
const SEARCH_DIRS = [
  path.join(process.cwd(), "manuscript"),
  process.cwd(),
  "/home/ubuntu/.cursor/projects/workspace",
  "/home/ubuntu/.cursor/projects/workspace/assets",
  "/home/workdir",
  "/home/workdir/attachments",
  "/tmp",
  "/cursor/stores/self/source",
];
const SEARCH_PATHS = [
  ...SEARCH_DIRS.flatMap((dir) => ZIP_NAMES.map((name) => path.join(dir, name))),
  process.env.MANUSCRIPT_ZIP,
].filter(Boolean);

const OUT_DIR = path.join(process.cwd(), "src", "generated", "book");
const PUBLIC_BOOK = path.join(process.cwd(), "public", "book");
const REPORT_PATH =
  process.env.LATEX_CONVERSION_REPORT ||
  "/cursor/stores/bc-425eb910-84c9-496e-82c4-4866fc10d80d/internal/latex-conversion-report.md";

function findZip() {
  for (const candidate of SEARCH_PATHS) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function extractZip(zipPath, dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  execFileSync("unzip", ["-q", zipPath, "-d", dest], { stdio: "inherit" });
}

function walkTexFiles(root) {
  const files = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".") && entry.name !== "node_modules") stack.push(full);
      } else if (entry.name.endsWith(".tex")) {
        files.push(full);
      }
    }
  }
  return files;
}

function findMainTex(root, texFiles) {
  const scored = texFiles.map((file) => {
    const base = path.basename(file).toLowerCase();
    const text = fs.readFileSync(file, "utf8");
    let score = 0;
    if (base.includes("main")) score += 5;
    if (text.includes("\\documentclass")) score += 3;
    if (text.includes("\\begin{document}")) score += 2;
    if ((text.match(/\\include\{/g) || []).length > 3) score += 2;
    return { file, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.file ?? texFiles[0];
}

function resolveTexPath(root, ref) {
  const noExt = ref.replace(/\.tex$/, "");
  const candidates = [
    path.join(root, `${ref}.tex`),
    path.join(root, `${noExt}.tex`),
    path.join(root, ref),
    path.join(root, noExt),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

const SKIP_INPUT_REFS = new Set([
  "frontmatter/title",
  "frontmatter/copyright",
  "frontmatter/dedication",
]);

function slugFromTexFile(filePath) {
  const base = path.basename(filePath, ".tex");
  const chapterMatch = base.match(/^ch(\d+)_/i);
  if (chapterMatch) return `chapter-${Number(chapterMatch[1])}`;

  const staticSlugs = {
    preface: "preface",
    acknowledgements: "acknowledgements",
    epilogue: "epilogue",
    appendix_a: "appendix-a",
    appendix_b: "appendix-b",
    appendix_c: "appendix-c",
    worksheet: "worksheet",
    glossary: "glossary",
    further_reading: "further-reading",
    index: "index",
    about_author: "about-the-author",
  };
  return staticSlugs[base] ?? null;
}

function collectIncludes(mainFile, root) {
  const text = fs.readFileSync(mainFile, "utf8");
  const docMatch = text.match(/\\begin\{document\}([\s\S]*)\\end\{document\}/);
  const body = docMatch ? docMatch[1] : text;
  const skipRoots = new Set(["preamble", "macros", "figures"]);
  const order = [];
  const re = /\\(?:include|input)\{([^}]+)\}/g;
  let match;
  while ((match = re.exec(body))) {
    const ref = match[1].replace(/\.tex$/, "");
    const base = path.basename(ref);
    if (skipRoots.has(base)) continue;
    if (SKIP_INPUT_REFS.has(ref)) continue;
    const resolved = resolveTexPath(path.dirname(mainFile), match[1]);
    if (resolved) order.push(resolved);
  }
  if (order.length === 0) {
    return walkTexFiles(root)
      .filter((f) => f !== mainFile && !f.includes("preamble"))
      .sort();
  }
  return order;
}

function slugForChapter(title, counters) {
  const t = title.toLowerCase();
  if (/\bpreface\b/.test(t)) return "preface";
  if (/\bintroduction\b/.test(t)) return "introduction";
  if (/\bglossary\b/.test(t)) return "glossary";
  if (/\bepilogue\b/.test(t)) return "epilogue";
  if (/\breferences\b/.test(t) || /\bbibliography\b/.test(t)) return "references";
  if (/\bappendix\b/.test(t)) {
    counters.appendix += 1;
    const letter = String.fromCharCode(96 + counters.appendix);
    return `appendix-${letter}`;
  }
  counters.chapter += 1;
  return `chapter-${counters.chapter}`;
}

function extractChapterTitle(tex, filePath) {
  const chapter = tex.match(/\\chapter\*?(?:\[[^\]]*\])?\{([^}]+)\}/);
  if (chapter) return chapter[1].replace(/\s+/g, " ").trim();
  const section = tex.match(/\\section\*?(?:\[[^\]]*\])?\{([^}]+)\}/);
  if (section) return section[1].replace(/\s+/g, " ").trim();

  const staticTitles = {
    preface: "Preface",
    acknowledgements: "Acknowledgements",
    epilogue: "Epilogue",
    appendix_a: "Appendix A: Recovery Instrumentation and Auditing",
    appendix_b: "Appendix B: Four Practical System Designs",
    appendix_c: "Appendix C: Security, Privacy, and Cost Review",
    worksheet: "Hidden Assumptions: A Blank Worksheet",
    glossary: "Glossary",
    further_reading: "Further Reading",
    index: "Concept Guide",
    about_author: "About the Author",
  };
  const base = path.basename(filePath, ".tex");
  if (staticTitles[base]) return staticTitles[base];

  return path.basename(filePath, ".tex").replace(/[-_]/g, " ");
}

function copyFigureAssets(extractRoot, mediaDir) {
  fs.mkdirSync(mediaDir, { recursive: true });
  for (const dirName of ["final_image", "figures"]) {
    const srcDir = path.join(extractRoot, dirName);
    if (!fs.existsSync(srcDir)) continue;
    for (const name of fs.readdirSync(srcDir)) {
      const src = path.join(srcDir, name);
      if (!fs.statSync(src).isFile()) continue;
      fs.copyFileSync(src, path.join(mediaDir, name));
    }
  }
}

function resolveFigureOnDisk(extractRoot, texDir, src) {
  const base = path.basename(src);
  const stem = base.replace(/\.(png|webp|jpg|jpeg)$/i, "");
  const candidates = [
    path.join(extractRoot, "final_image", base),
    path.join(extractRoot, "final_image", `${stem}.webp`),
    path.join(extractRoot, "final_image", `${stem}.png`),
    path.join(extractRoot, "figures", base),
    path.join(texDir, src),
    path.join(texDir, base),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function pandocToHtml(texPath, extractRoot, mediaDir, figureExpansions) {
  const raw = fs.readFileSync(texPath, "utf8");
  const processed = preprocessLatex(raw, { figureExpansions });
  const tmp = path.join(os.tmpdir(), `baodium-${path.basename(texPath)}`);
  fs.writeFileSync(tmp, processed);

  const lua = path.join(process.cwd(), "scripts", "lua", "custom-environments.lua");
  const resourcePath = [path.dirname(texPath), extractRoot, path.join(extractRoot, "figures")].join(path.delimiter);

  const html = execFileSync(
    "pandoc",
    [
      tmp,
      "--from=latex+raw_tex",
      "--to=html5",
      "--standalone",
      "--mathjax",
      `--lua-filter=${lua}`,
      `--resource-path=${resourcePath}`,
      "--wrap=none",
    ],
    { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 },
  );

  fs.unlinkSync(tmp);

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  let body = bodyMatch ? bodyMatch[1] : html;

  body = body.replace(/src="([^"]+)"/g, (_, src) => {
    if (src.startsWith("http") || src.startsWith("/book/")) return `src="${src}"`;
    const source = resolveFigureOnDisk(extractRoot, path.dirname(texPath), src);
    if (source) {
      const destName = path.basename(source);
      fs.mkdirSync(mediaDir, { recursive: true });
      const dest = path.join(mediaDir, destName);
      if (!fs.existsSync(dest)) fs.copyFileSync(source, dest);
      return `src="/book/figures/${destName}"`;
    }
    return `src="${src}"`;
  });

  return { html: body.trim(), raw, processed };
}

function extractSectionsFromHtml(html) {
  const sections = [];
  const re = /<h([23])[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m;
  while ((m = re.exec(html))) {
    sections.push({
      level: Number(m[1]),
      id: m[2],
      title: m[3].replace(/<[^>]+>/g, "").trim(),
    });
  }
  return sections;
}

function writeReport(report) {
  const dir = path.dirname(REPORT_PATH);
  fs.mkdirSync(dir, { recursive: true });
  const frontmatter = `---
cursor:
  subagentId: "bc-3bf7069c-f698-5543-85ed-8e856fdb1f2f"
---

`;
  fs.writeFileSync(REPORT_PATH, frontmatter + report);
}

async function main() {
  const zipPath = findZip();
  const existingManifest = path.join(OUT_DIR, "manifest.json");
  if (!zipPath && fs.existsSync(existingManifest)) {
    console.log("[convert-manuscript] No zip found; using committed generated book output.");
    return;
  }
  if (!zipPath) {
    const searched = SEARCH_PATHS.map((p) => `- \`${p}\``).join("\n");
    const report = `# LaTeX conversion report

**Status:** blocked — manuscript zip not found.

## Searched paths

${searched}

## Action required

Place the author zip in \`manuscript/\` at the repo root (gitignored) or set \`MANUSCRIPT_ZIP\` to its absolute path, then run \`npm run build\` again.
`;
    writeReport(report);
    console.error(`[convert-manuscript] Missing author zip. See ${REPORT_PATH}`);
    process.exit(1);
  }

  const extractRoot = path.join(os.tmpdir(), "baodium-manuscript-src");
  extractZip(zipPath, extractRoot);

  const texFiles = walkTexFiles(extractRoot);
  if (texFiles.length === 0) {
    writeReport("# LaTeX conversion report\n\n**Status:** failed — no `.tex` files in zip.\n");
    process.exit(1);
  }

  const mainTex = findMainTex(extractRoot, texFiles);
  const manuscriptDir = path.dirname(mainTex);
  const chapterFiles = collectIncludes(mainTex, manuscriptDir);
  const figuresTexPath = path.join(manuscriptDir, "figures.tex");
  const figureExpansions = fs.existsSync(figuresTexPath)
    ? loadFigureMacroExpansions(fs.readFileSync(figuresTexPath, "utf8"))
    : new Map();

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(PUBLIC_BOOK, { recursive: true });
  const mediaDir = path.join(PUBLIC_BOOK, "figures");
  fs.rmSync(mediaDir, { recursive: true, force: true });
  copyFigureAssets(extractRoot, mediaDir);

  const counters = { chapter: 0, appendix: 0 };
  const manifest = { generatedAt: new Date().toISOString(), zip: path.basename(zipPath), chapters: [] };
  const unsupportedMacros = new Set();
  const failedRefs = [];
  const labelsGlobal = new Map();

  for (const file of chapterFiles) {
    const rawText = fs.readFileSync(file, "utf8");
    const title = extractChapterTitle(rawText, file);
    const slug = slugFromTexFile(file) ?? slugForChapter(title, counters);
    const { html, raw } = pandocToHtml(file, extractRoot, mediaDir, figureExpansions);
    const sections = extractSectionsFromHtml(html);

    for (const [label] of extractLabels(raw)) labelsGlobal.set(label, slug);
    const refs = extractRefs(raw);
    for (const ref of refs) {
      if (!labelsGlobal.has(ref)) failedRefs.push({ slug, ref });
    }
    for (const macro of findUnknownMacros(raw)) unsupportedMacros.add(macro);

    const chapter = {
      slug,
      title,
      sections,
      html,
    };
    fs.writeFileSync(path.join(OUT_DIR, `${slug}.json`), JSON.stringify(chapter, null, 0));
    manifest.chapters.push({ slug, title, sections: sections.map((s) => ({ id: s.id, title: s.title, level: s.level })) });
  }

  for (let i = 0; i < manifest.chapters.length; i++) {
    manifest.chapters[i].prev = i > 0 ? manifest.chapters[i - 1].slug : null;
    manifest.chapters[i].next = i < manifest.chapters.length - 1 ? manifest.chapters[i + 1].slug : null;
  }

  fs.writeFileSync(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(
    path.join(process.cwd(), "src", "data", "book-toc.json"),
    JSON.stringify(
      manifest.chapters.map((c) => ({ slug: c.slug, title: c.title })),
      null,
      2,
    ),
  );

  const searchIndex = manifest.chapters.map((ch) => {
    const data = JSON.parse(fs.readFileSync(path.join(OUT_DIR, `${ch.slug}.json`), "utf8"));
    const plain = data.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 8000);
    return { slug: ch.slug, title: ch.title, excerpt: plain.slice(0, 400) };
  });
  fs.mkdirSync(path.join(process.cwd(), "public", "book"), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), "public", "book", "search-index.json"), JSON.stringify(searchIndex));

  const report = `# LaTeX conversion report

**Status:** success  
**Zip:** \`${zipPath}\`  
**Main TeX:** \`${mainTex}\`  
**Chapters converted:** ${manifest.chapters.length}  
**Generated:** ${manifest.generatedAt}

## Routes

${manifest.chapters.map((c) => `- /system-design/${c.slug} — ${c.title}`).join("\n")}

## Unsupported / unmapped macros (${unsupportedMacros.size})

${unsupportedMacros.size ? [...unsupportedMacros].map((m) => `- \\\\${m}`).join("\n") : "_None flagged._"}

## Failed references (${failedRefs.length})

${failedRefs.length ? failedRefs.map((f) => `- \`${f.slug}\` → \\\\ref{${f.ref}}`).join("\n") : "_None._"}

## Notes

- Custom environments \`decision\`, \`fieldnote\`, and \`hiddenassumptions\` are mapped via preprocess + Lua filter.
- Figures are copied to \`public/book/figures/\`.
- Re-run \`node scripts/convert-manuscript.mjs\` after manuscript updates.
`;

  writeReport(report);
  console.log(`[convert-manuscript] Converted ${manifest.chapters.length} chapters → ${OUT_DIR}`);

  const { enhanceAllChapters } = await import("./enhance-book-html.mjs");
  await enhanceAllChapters();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

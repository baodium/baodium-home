/**
 * Post-process generated chapter HTML for the online reader:
 * - Strip Pandoc/LaTeX listing option dumps; highlight with Shiki
 * - Render MathJax-style spans with KaTeX
 * - Convert leaked `::: decision|fieldnote|hiddenassumptions` fences to callout components
 * - Resolve `\ref{...}` (including those wrongly wrapped as math)
 * - Strip duplicate leading <h1> (page chrome already shows the title)
 * - Fill missing image alt text from figcaptions / figure ids
 *
 * Idempotent for already-enhanced listings/math/callouts.
 */

import fs from "node:fs";
import path from "node:path";
import katex from "katex";
import { createHighlighter } from "shiki";

const OUT_DIR = path.join(process.cwd(), "src", "generated", "book");

const LANG_ALIASES = {
  python: "python",
  py: "python",
  sql: "sql",
  bash: "bash",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  yaml: "yaml",
  yml: "yaml",
  json: "json",
  javascript: "javascript",
  js: "javascript",
  typescript: "typescript",
  ts: "typescript",
  go: "go",
  golang: "go",
  rust: "rust",
  java: "java",
  c: "c",
  cpp: "cpp",
  "c++": "cpp",
  plaintext: "text",
  text: "text",
  plain: "text",
  promql: "text",
  metrics: "text",
};

const CALLOUT_META = {
  decision: { className: "book-decision", label: "Decision review" },
  fieldnote: { className: "book-fieldnote", label: "Field note" },
  hiddenassumptions: { className: "book-hiddenassumptions", label: "Hidden assumptions" },
  assumptionledger: { className: "book-hiddenassumptions", label: "Hidden assumptions" },
  custombox: { className: "book-fieldnote", label: "Note" },
  tcolorbox: { className: "book-fieldnote", label: "Note" },
};

function decodeEntities(str) {
  return str
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ");
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function readBraced(source, start) {
  if (source[start] !== "{") return null;
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return { content: source.slice(start + 1, i), end: i + 1 };
    }
  }
  return null;
}

function parseOptionBlock(source) {
  const trimmed = source.trimStart();
  if (!trimmed.startsWith("[")) return null;
  const head = trimmed.slice(0, Math.min(trimmed.length, 80)).toLowerCase();
  if (!/(language|caption|label)\s*=/.test(head)) return null;

  let i = trimmed.indexOf("[") + 1;
  const fields = {};
  while (i < trimmed.length) {
    while (i < trimmed.length && /[\s,]/.test(trimmed[i])) i += 1;
    if (i >= trimmed.length) break;
    if (trimmed[i] === "]") {
      i += 1;
      break;
    }
    const keyMatch = trimmed.slice(i).match(/^(language|caption|label)\s*=/i);
    if (!keyMatch) return null;
    const key = keyMatch[1].toLowerCase();
    i += keyMatch[0].length;
    while (i < trimmed.length && /\s/.test(trimmed[i])) i += 1;
    if (trimmed[i] === "{") {
      const braced = readBraced(trimmed, i);
      if (!braced) return null;
      fields[key] = braced.content.replace(/\s+/g, " ").trim();
      i = braced.end;
    } else {
      const valueMatch = trimmed.slice(i).match(/^([A-Za-z0-9_+.-]+)/);
      if (!valueMatch) return null;
      fields[key] = valueMatch[1];
      i += valueMatch[1].length;
    }
  }
  return { fields, code: trimmed.slice(i).replace(/^\s*\n?/, "") };
}

function detectLanguage(code, explicit) {
  if (explicit) {
    const key = explicit.toLowerCase().trim();
    if (LANG_ALIASES[key]) return LANG_ALIASES[key];
  }
  const sample = code.slice(0, 400);
  if (/^\s*(def |class |import |from \w+ import )/m.test(sample)) return "python";
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|WITH)\b/im.test(sample)) return "sql";
  if (/^\s*(#!\/bin\/|npm |docker |kubectl |curl )/m.test(sample)) return "bash";
  if (/^\s*(\{|\[)/.test(sample) && /"\w+"\s*:/.test(sample)) return "json";
  return "text";
}

function displayLang(lang) {
  const map = {
    python: "Python",
    sql: "SQL",
    bash: "Bash",
    yaml: "YAML",
    json: "JSON",
    javascript: "JavaScript",
    typescript: "TypeScript",
    go: "Go",
    rust: "Rust",
    java: "Java",
    text: "Code",
  };
  return map[lang] ?? lang;
}

async function highlightCode(highlighter, code, lang) {
  try {
    return highlighter.codeToHtml(code.replace(/\n$/, ""), {
      lang: lang === "text" ? "text" : lang,
      theme: "github-dark-default",
    });
  } catch {
    return highlighter.codeToHtml(code.replace(/\n$/, ""), {
      lang: "text",
      theme: "github-dark-default",
    });
  }
}

function stripLeadingH1(html) {
  return html.replace(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>\s*/i, "");
}

function lightMarkdown(html) {
  return html
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|>)\s*—\s*(<|$)/g, "$1<hr class=\"book-callout-rule\" />$2");
}

function balanceParagraphs(html) {
  const opens = (html.match(/<p\b[^>]*>/gi) || []).length;
  const closes = (html.match(/<\/p>/gi) || []).length;
  if (opens <= closes) return html;
  return `${html}${"</p>".repeat(opens - closes)}`;
}

function wrapCallout(type, body) {
  const meta = CALLOUT_META[type];
  if (!meta) return null;
  if (body.includes(`class="${meta.className}"`)) return null;
  const inner = lightMarkdown(balanceParagraphs(body.trim()));
  return `<aside class="${meta.className}" role="note" data-callout="${type}"><p class="book-callout-label">${meta.label}</p>${inner}</aside>`;
}

function enhanceCallouts(html) {
  // Pandoc latex path leaks fenced divs. Closers may be a lone <p>:::</p>
  // or a trailing :::</p> at the end of the last content paragraph.
  let out = html.replace(
    /<p>\s*:::\s*([a-zA-Z][\w-]*)\s*<\/p>([\s\S]*?)(?:<br\s*\/?>\s*)?:::\s*<\/p>/gi,
    (full, rawType, body) => wrapCallout(rawType.toLowerCase(), body) ?? full,
  );

  // Blank worksheet / truncated fences: open marker with no closer → until next heading or EOF.
  out = out.replace(
    /<p>\s*:::\s*([a-zA-Z][\w-]*)\s*<\/p>([\s\S]*?)(?=<h[1-6]\b|$)/gi,
    (full, rawType, body) => {
      if (/:::\s*<\/p>/.test(body) || body.includes(":::") ) return full;
      return wrapCallout(rawType.toLowerCase(), body) ?? full;
    },
  );
  return out;
}

function collectIds(html) {
  const ids = new Set();
  for (const m of html.matchAll(/\bid="([^"]+)"/g)) ids.add(m[1]);
  return ids;
}

function humanizeLabel(label) {
  if (label.startsWith("fig:")) return "Figure";
  if (label.startsWith("tab:")) return "Table";
  if (label.startsWith("lst:")) return "Listing";
  if (label.startsWith("sec:") || label.startsWith("chapter")) return "Section";
  return "Cross-reference";
}

function resolveRefs(html) {
  const ids = collectIds(html);
  // Refs wrongly wrapped as math: <span class="math inline">\(\ref{...}\)</span>
  html = html.replace(
    /<span class="math inline">\s*\\?\(\\ref\{([^}]+)\}\\?\)\s*<\/span>/g,
    (_, label) => {
      if (ids.has(label)) {
        return `<a class="book-xref" href="#${escapeHtml(label)}">${humanizeLabel(label)}</a>`;
      }
      return `<span class="book-xref-missing">${humanizeLabel(label)}</span>`;
    },
  );
  // Bare \ref{...}
  html = html.replace(/\\ref\{([^}]+)\}/g, (_, label) => {
    if (ids.has(label)) {
      return `<a class="book-xref" href="#${escapeHtml(label)}">${humanizeLabel(label)}</a>`;
    }
    return `<span class="book-xref-missing">${humanizeLabel(label)}</span>`;
  });
  return html;
}

function enhanceAlts(html) {
  return html.replace(/<figure\b([^>]*)>([\s\S]*?)<\/figure>/gi, (full, attrs, inner) => {
    const imgMatch = inner.match(/<img\b([^>]*?)\/?>/i);
    if (!imgMatch) return full;
    const imgAttrs = imgMatch[1];
    if (/\balt="/i.test(imgAttrs)) return full;

    const caption = inner.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i);
    let alt = caption
      ? decodeEntities(caption[1].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim()
      : "";
    if (!alt) {
      const idMatch = attrs.match(/\bid="([^"]+)"/i);
      alt = idMatch
        ? `Diagram for ${idMatch[1].replace(/^fig:/, "").replace(/[-_]/g, " ")}`
        : "Diagram from the chapter";
    }
    const newImg = `<img${imgAttrs} alt="${escapeHtml(alt)}" />`;
    return `<figure${attrs}>${inner.replace(imgMatch[0], newImg)}</figure>`;
  });
}

function renderMath(html) {
  return html.replace(
    /<span class="math (inline|display)">([\s\S]*?)<\/span>/g,
    (full, mode, body) => {
      if (body.includes('class="katex"') || body.includes("class='katex'")) return full;
      // Skip unresolved refs still inside math (should already be replaced)
      if (/\\ref\{/.test(body)) return full;
      let tex = decodeEntities(body).trim();
      if (tex.startsWith("\\[")) tex = tex.slice(2);
      if (tex.endsWith("\\]")) tex = tex.slice(0, -2);
      if (tex.startsWith("\\(")) tex = tex.slice(2);
      if (tex.endsWith("\\)")) tex = tex.slice(0, -2);
      tex = tex.trim();
      try {
        return katex.renderToString(tex, {
          displayMode: mode === "display",
          throwOnError: false,
          strict: "ignore",
          trust: false,
        });
      } catch {
        return full;
      }
    },
  );
}

async function enhanceListings(html, highlighter) {
  const parts = [];
  const re = /<pre><code>([\s\S]*?)<\/code><\/pre>/g;
  let last = 0;
  let match;
  while ((match = re.exec(html))) {
    parts.push(html.slice(last, match.index));
    const decoded = decodeEntities(match[1] ?? "");
    const parsed = parseOptionBlock(decoded);
    const code = parsed ? parsed.code : decoded;
    const fields = parsed?.fields ?? {};
    const lang = detectLanguage(code, fields.language);
    const highlighted = await highlightCode(highlighter, code, lang);
    const idAttr = fields.label ? ` id="${escapeHtml(fields.label)}"` : "";
    const caption = fields.caption
      ? `<figcaption class="book-listing-caption">${escapeHtml(fields.caption)}</figcaption>`
      : "";
    const langBadge = `<span class="book-listing-lang">${escapeHtml(displayLang(lang))}</span>`;
    const framed = highlighted.replace(
      /^<pre([^>]*)>/,
      `<pre$1 data-language="${escapeHtml(lang)}">`,
    );
    parts.push(
      `<figure class="book-listing"${idAttr}>${caption}<div class="book-listing-frame"><div class="book-listing-chrome">${langBadge}<button type="button" class="code-copy" aria-label="Copy code"><span class="code-copy-label">Copy</span></button></div>${framed}</div></figure>`,
    );
    last = match.index + match[0].length;
  }
  parts.push(html.slice(last));
  return parts.join("");
}

export async function enhanceChapterHtml(html, highlighter) {
  if (!html) return html;
  let out = html;
  out = stripLeadingH1(out);
  out = await enhanceListings(out, highlighter);
  out = enhanceCallouts(out);
  out = resolveRefs(out);
  out = enhanceAlts(out);
  out = renderMath(out);
  return out;
}

export async function enhanceAllChapters() {
  if (!fs.existsSync(OUT_DIR)) {
    console.log("[enhance-book-html] No generated book dir; skipping.");
    return { count: 0 };
  }

  const highlighter = await createHighlighter({
    themes: ["github-dark-default"],
    langs: [
      "python",
      "sql",
      "bash",
      "yaml",
      "json",
      "javascript",
      "typescript",
      "go",
      "rust",
      "java",
      "c",
      "cpp",
      "text",
    ],
  });

  const files = fs
    .readdirSync(OUT_DIR)
    .filter((f) => f.endsWith(".json") && f !== "manifest.json");
  let count = 0;
  const summary = {
    listings: 0,
    callouts: 0,
    katex: 0,
    alts: 0,
    unresolvedRefs: 0,
    rawFences: 0,
    rawMath: 0,
    listingMeta: 0,
  };

  for (const file of files) {
    const full = path.join(OUT_DIR, file);
    const data = JSON.parse(fs.readFileSync(full, "utf8"));
    if (!data.html) continue;
    data.html = await enhanceChapterHtml(data.html, highlighter);
    fs.writeFileSync(full, JSON.stringify(data));
    summary.listings += (data.html.match(/class="book-listing"/g) || []).length;
    summary.callouts += (data.html.match(/class="book-(decision|fieldnote|hiddenassumptions)"/g) || []).length;
    summary.katex += (data.html.match(/class="katex/g) || []).length;
    summary.alts += (data.html.match(/<img\b[^>]*\balt="/g) || []).length;
    summary.unresolvedRefs += (data.html.match(/book-xref-missing/g) || []).length;
    summary.rawFences += (data.html.match(/::: (decision|fieldnote|hiddenassumptions)/g) || []).length;
    summary.rawMath += (data.html.match(/class="math /g) || []).length;
    summary.listingMeta += (data.html.match(/language=Python|caption=\{/g) || []).length;
    count += 1;
  }

  highlighter.dispose();
  console.log(
    `[enhance-book-html] Enhanced ${count} chapters — listings ${summary.listings}, callouts ${summary.callouts}, katex ${summary.katex}, imgs-with-alt ${summary.alts}, missing-xrefs ${summary.unresolvedRefs}, leftover-fences ${summary.rawFences}, leftover-math ${summary.rawMath}, leftover-listing-meta ${summary.listingMeta}`,
  );
  return { count, ...summary };
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isMain) {
  enhanceAllChapters().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

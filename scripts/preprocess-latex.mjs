/**
 * Prepare LaTeX fragments for Pandoc: map custom environments to fenced divs,
 * expand book figure macros, and strip constructs Pandoc cannot parse.
 */

const ENV_MAP = {
  decision: "decision",
  fieldnote: "fieldnote",
  hiddenassumptions: "hiddenassumptions",
  assumptionledger: "hiddenassumptions",
  objectives: "objectives",
  summarypoints: "summarypoints",
  checklist: "checklist",
  invariantbox: "invariantbox",
  warningbox: "warningbox",
  principlebox: "principlebox",
  reflectnote: "reflectnote",
  custombox: "custombox",
};

const INLINE_MACRO_REPLACEMENTS = [
  [/\\term\{([^}]*)\}/g, "\\emph{$1}"],
  [/\\code\{([^}]*)\}/g, "\\texttt{$1}"],
  [/\\metric\{([^}]*)\}/g, "\\texttt{$1}"],
  [/\\strong\{([^}]*)\}/g, "\\textbf{$1}"],
  [/\\smallgap\b/g, "\n\n"],
  [/\\scenario\{([\s\S]*?)\}/g, "\n\n::: custombox\nScenario\n\n$1\n:::\n\n"],
  [/\\ledgerrow\{([^}]*)\}\{([^}]*)\}/g, "$1 & $2 \\\\\n"],
  [/\\tighttables\b/g, ""],
  [/\\seqsplit\{([^}]*)\}/g, "$1"],
];

/** Parse figures.tex for \\fig* macro bodies (\\bookfigure{...}). */
export function loadFigureMacroExpansions(figuresTex) {
  const expansions = new Map();
  if (!figuresTex) return expansions;

  const bookFigureRe =
    /\\newcommand\{\\(fig[A-Za-z0-9]+)\}\{\\bookfigure\{([^}]+)\}\{([\s\S]*?)\}\{([^}]+)\}\}/g;
  let m;
  while ((m = bookFigureRe.exec(figuresTex))) {
    const [, name, asset, caption, label] = m;
    const body = expandBookFigure(asset, caption, label);
    expansions.set(name, body);
  }

  // Multi-line \\bookfigure definitions
  const blockRe = /\\newcommand\{\\(fig[A-Za-z0-9]+)\}\{([\s\S]*?)\}(?=\n\\newcommand|\n*$)/g;
  while ((m = blockRe.exec(figuresTex))) {
    if (expansions.has(m[1])) continue;
    const inner = m[2].trim();
    const bf = inner.match(
      /\\bookfigure\{([^}]+)\}\{([\s\S]*?)\}\{([^}]+)\}/,
    );
    if (bf) {
      expansions.set(m[1], expandBookFigure(bf[1], bf[2], bf[3]));
    }
  }

  return expansions;
}

function expandBookFigure(asset, caption, label) {
  const base = asset.replace(/\.(png|webp|jpg)$/i, "");
  return `
\\begin{figure}[htbp]
\\centering
\\includegraphics[width=\\linewidth]{final_image/${base}.webp}
\\caption{${caption.trim()}}\\label{${label}}
\\end{figure}
`;
}

function readBracedGroup(source, openIndex) {
  if (source[openIndex] !== "{") return null;
  let depth = 0;
  for (let i = openIndex; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return { content: source.slice(openIndex + 1, i), end: i + 1 };
      }
    }
  }
  return null;
}

function expandLocalMacroDefinitions(source) {
  const defs = [];
  let out = "";
  let i = 0;
  while (i < source.length) {
    const cmdMatch = source.slice(i).match(/^\\(?:providecommand|newcommand|renewcommand)/);
    if (cmdMatch && cmdMatch.index === 0) {
      let pos = i + cmdMatch[0].length;
      const nameGroup = readBracedGroup(source, pos);
      if (!nameGroup) {
        out += source[i];
        i += 1;
        continue;
      }
      pos = nameGroup.end;
      if (source[pos] === "[") {
        const close = source.indexOf("]", pos);
        pos = close >= 0 ? close + 1 : pos;
      }
      const bodyGroup = readBracedGroup(source, pos);
      if (bodyGroup) {
        const macroName = nameGroup.content.replace(/^\\/, "");
        defs.push({ name: macroName, body: bodyGroup.content });
        i = bodyGroup.end;
        continue;
      }
    }
    out += source[i];
    i += 1;
  }

  for (const { name, body } of defs) {
    out = out.replace(new RegExp(`\\\\${name}\\b`, "g"), body);
  }
  return out;
}

function stripUnsupportedPreambleLines(source) {
  const dropPatterns = [
    /^\\usepackage\b/,
    /^\\usetikzlibrary\b/,
    /^\\geometry\b/,
    /^\\defaultfontfeatures\b/,
    /^\\setmainfont\b/,
    /^\\setsansfont\b/,
    /^\\setmonofont\b/,
    /^\\definecolor\b/,
    /^\\newcolumntype\b/,
    /^\\renewcommand\\thead/,
    /^\\renewcommand\\cellalign/,
    /^\\renewcommand\\theadalign/,
    /^\\setcounter\b/,
    /^\\setlength\b/,
    /^\\setstretch\b/,
    /^\\setlist\b/,
    /^\\captionsetup\b/,
    /^\\graphicspath\b/,
    /^\\numberwithin\b/,
    /^\\clubpenalty\b/,
    /^\\widowpenalty\b/,
    /^\\displaywidowpenalty\b/,
    /^\\raggedbottom\b/,
    /^\\lstdefinelanguage\b/,
    /^\\NewDocumentCommand\b/,
    /^\\NewDocumentEnvironment\b/,
    /^\\newcounter\b/,
    /^\\refstepcounter\b/,
    /^\\stepcounter\b/,
    /^\\hypersetup\b/,
    /^\\IfFileExists\b/,
    /^\\includepdf\b/,
    /^\\frontmatter\b/,
    /^\\mainmatter\b/,
    /^\\backmatter\b/,
    /^\\part\b/,
    /^\\tableofcontents\b/,
    /^\\clearpage\b/,
    /^\\pagestyle\b/,
    /^\\thispagestyle\b/,
  ];

  return source
    .split("\n")
    .filter((line) => !dropPatterns.some((re) => re.test(line.trim())))
    .join("\n");
}

function replaceBracedCommand(source, commandName, transform) {
  const token = `\\${commandName}`;
  let out = "";
  let i = 0;
  while (i < source.length) {
    if (source.startsWith(token, i) && source[i + token.length] === "{") {
      const body = readBracedGroup(source, i + token.length);
      if (body) {
        out += transform(body.content);
        i = body.end;
        continue;
      }
    }
    out += source[i];
    i += 1;
  }
  return out;
}

function replaceTitledEnvironments(source, envMap) {
  let out = source;
  for (const [env, className] of Object.entries(envMap)) {
    const beginToken = `\\begin{${env}}`;
    const endToken = `\\end{${env}}`;
    let rebuilt = "";
    let i = 0;
    while (i < out.length) {
      if (out.startsWith(beginToken, i)) {
        let pos = i + beginToken.length;
        let titleBlock = "";
        if (out[pos] === "{") {
          const title = readBracedGroup(out, pos);
          if (title) {
            titleBlock = `\n**${title.content}**\n\n`;
            pos = title.end;
          }
        }
        rebuilt += `\n\n::: ${className}\n${titleBlock}`;
        i = pos;
        continue;
      }
      if (out.startsWith(endToken, i)) {
        rebuilt += "\n:::\n\n";
        i += endToken.length;
        continue;
      }
      rebuilt += out[i];
      i += 1;
    }
    out = rebuilt;
  }
  return out;
}

function expandDecisionHelpers(source) {
  let out = source;
  out = replaceBracedCommand(out, "situation", (body) => `${body}\n\n`);
  out = replaceBracedCommand(out, "choice", (body) => `\n\n**${body}**\n\n`);
  out = replaceBracedCommand(out, "outcome", (body) => `\n\n---\n\n${body}\n\n`);
  return out;
}

function simplifyTables(source) {
  let out = source;
  out = out.replace(/\\begin\{tabularx\}(\{[^}]*\})?/g, "\\begin{tabular}$1");
  out = out.replace(/\\end\{tabularx\}/g, "\\end{tabular}");
  out = out.replace(/\\begin\{tcolorbox\}(\[[^\]]*\])?/g, "\n\n::: tcolorbox\n");
  out = out.replace(/\\end\{tcolorbox\}/g, "\n:::\n\n");
  return out;
}

export function preprocessLatex(source, options = {}) {
  let out = source;
  const { figureExpansions } = options;

  out = expandLocalMacroDefinitions(out);

  if (figureExpansions) {
    for (const [name, body] of figureExpansions) {
      out = out.replace(new RegExp(`\\\\${name}\\b`, "g"), body);
    }
  }

  out = out.replace(
    /\\bookfigure\{([^}]+)\}\{([\s\S]*?)\}\{([^}]+)\}/g,
    (_, asset, caption, label) => expandBookFigure(asset, caption, label),
  );

  for (const [pattern, replacement] of INLINE_MACRO_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }

  out = expandDecisionHelpers(out);

  out = replaceTitledEnvironments(out, ENV_MAP);

  out = simplifyTables(out);
  out = stripUnsupportedPreambleLines(out);

  out = out.replace(/\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g, (_, imgPath) => {
    let cleaned = imgPath.replace(/^\.\//, "");
    cleaned = cleaned.replace(/\.png$/i, ".webp");
    if (!/\.(webp|jpg|jpeg|gif|svg|pdf)$/i.test(cleaned)) {
      cleaned = `${cleaned}.webp`;
    }
    return `\\includegraphics{${cleaned}}`;
  });

  return out;
}

export function extractLabels(tex) {
  const labels = new Map();
  for (const match of tex.matchAll(/\\label\{([^}]+)\}/g)) {
    labels.set(match[1], match.index ?? 0);
  }
  return labels;
}

export function extractRefs(tex) {
  const refs = [];
  for (const match of tex.matchAll(/\\ref\{([^}]+)\}/g)) {
    refs.push(match[1]);
  }
  for (const match of tex.matchAll(/\\pageref\{([^}]+)\}/g)) {
    refs.push(match[1]);
  }
  return refs;
}

export function findUnknownMacros(tex) {
  const known = new Set([
    "chapter",
    "section",
    "subsection",
    "subsubsection",
    "paragraph",
    "begin",
    "end",
    "label",
    "ref",
    "pageref",
    "cite",
    "includegraphics",
    "textbf",
    "textit",
    "emph",
    "texttt",
    "footnote",
    "item",
    "itemize",
    "enumerate",
    "description",
    "figure",
    "table",
    "caption",
    "centering",
    "hline",
    "toprule",
    "midrule",
    "bottomrule",
    "vspace",
    "hspace",
    "newline",
    "linebreak",
    "pagebreak",
    "clearpage",
    "newpage",
    "input",
    "include",
    "usepackage",
    "documentclass",
    "title",
    "author",
    "date",
    "maketitle",
    "tableofcontents",
    "frontmatter",
    "mainmatter",
    "backmatter",
    "appendix",
    "part",
    "noindent",
    "indent",
    "ldots",
    "dots",
    "cdots",
    "textasciitilde",
    "textasciicircum",
    "textbackslash",
    "textless",
    "textgreater",
    "textbar",
    "textunderscore",
    "textquotesingle",
    "textquotedbl",
    "LaTeX",
    "TeX",
    "today",
    "thispagestyle",
    "chaptermark",
    "sectionmark",
    "addcontentsline",
    "phantomsection",
    "href",
    "url",
    "lstinline",
    "lstlisting",
    "verbatim",
    "tikz",
    "draw",
    "node",
    "path",
    "scope",
    "tabular",
    "tabularx",
    "multicolumn",
    "multirow",
    "textwidth",
    "linewidth",
    "text",
    "frac",
    "sqrt",
    "sum",
    "prod",
    "infty",
    "times",
    "cdot",
    "leq",
    "geq",
    "neq",
    "approx",
    "rightarrow",
    "leftarrow",
    "Rightarrow",
    "Leftarrow",
    "quad",
    "qquad",
    "enspace",
    "hfill",
    "vfill",
    "makecell",
    "thead",
    "cellalign",
    "arraystretch",
    "tabcolsep",
    "small",
    "footnotesize",
    "normalsize",
    "large",
    "Large",
    "bfseries",
    "sffamily",
    "raggedright",
    "centering",
    "arraybackslash",
    "p",
    "c",
    "r",
    "l",
    "X",
    "P",
    "Y",
    "L",
    "C",
    "R",
  ]);

  const macros = new Set();
  for (const match of tex.matchAll(/\\([A-Za-z@]+)/g)) {
    const name = match[1];
    if (!known.has(name) && !ENV_MAP[name]) {
      macros.add(name);
    }
  }
  return [...macros].sort();
}

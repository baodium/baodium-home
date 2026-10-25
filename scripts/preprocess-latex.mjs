/**
 * Prepare LaTeX fragments for Pandoc: map custom environments to fenced divs.
 */

const ENV_MAP = {
  decision: "decision",
  fieldnote: "fieldnote",
  hiddenassumptions: "hiddenassumptions",
  hiddenassumption: "hiddenassumptions",
};

export function preprocessLatex(source) {
  let out = source;

  for (const [env, className] of Object.entries(ENV_MAP)) {
    const begin = new RegExp(`\\\\begin\\{${env}\\*?\\}`, "g");
    const end = new RegExp(`\\\\end\\{${env}\\*?\\}`, "g");
    out = out.replace(begin, `\n\n::: ${className}\n`);
    out = out.replace(end, "\n:::\n\n");
  }

  // Diagram macros often expand to includegraphics — leave for Pandoc; log unknown \foo in converter.
  out = out.replace(/\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g, (_, path) => {
    const cleaned = path.replace(/^\.\//, "").replace(/^figures\//, "");
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
    "begin{figure}",
    "end{figure}",
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

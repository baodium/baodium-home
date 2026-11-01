"use client";

import dynamic from "next/dynamic";

const Ch1CodeEditor = dynamic(
  () => import("./Ch1CodeEditor").then((mod) => mod.Ch1CodeEditor),
  { ssr: false },
);

const FALLBACK_HIGHLIGHT = 3;

export function CodePanel({
  lines,
  highlightLine,
}: {
  lines: string[];
  highlightLine: number | null;
}) {
  const hl = highlightLine ?? FALLBACK_HIGHLIGHT;
  return (
    <div className="exp-panel overflow-hidden !p-0">
      <div className="flex items-center justify-between border-b border-[color:var(--exp-line)] px-4 py-2.5">
        <h3 className="font-serif text-lg text-[color:var(--exp-fg)]">get_product_page</h3>
        <p className="text-sm text-[color:var(--exp-muted)]">The pool is inside Recommendation.</p>
      </div>
      <Ch1CodeEditor lines={lines} highlightLine={hl} />
    </div>
  );
}

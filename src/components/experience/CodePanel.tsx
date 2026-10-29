"use client";

import dynamic from "next/dynamic";

const Ch1CodeEditor = dynamic(
  () => import("./Ch1CodeEditor").then((mod) => mod.Ch1CodeEditor),
  { ssr: false },
);

const FALLBACK_HIGHLIGHT = 7;

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
        <h3 className="font-serif text-lg text-[color:var(--exp-fg)]">Product handler</h3>
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[color:var(--exp-muted)]">
          Same request as the graph
        </p>
      </div>
      <Ch1CodeEditor lines={lines} highlightLine={hl} />
    </div>
  );
}

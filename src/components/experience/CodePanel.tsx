"use client";

import dynamic from "next/dynamic";
import { RunningCode } from "@/components/experience/RunningCode";
import type { RunningProgram } from "@/lib/experience/running-code";

const Ch1CodeEditor = dynamic(
  () => import("./Ch1CodeEditor").then((mod) => mod.Ch1CodeEditor),
  { ssr: false },
);

const FALLBACK_HIGHLIGHT = 3;

export function CodePanel({
  source,
  highlightLine,
  program,
  onEdit,
  onSource,
}: {
  source: string;
  highlightLine: number | null;
  program?: RunningProgram;
  onEdit?: (id: string, value: number | boolean | string) => void;
  onSource: (source: string) => void;
}) {
  const hl = highlightLine ?? FALLBACK_HIGHLIGHT;
  return (
    <div className="exp-panel overflow-hidden !p-0">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[color:var(--exp-line)] px-4 py-2.5">
        <h3 className="font-serif text-lg text-[color:var(--exp-fg)]">get_product_page</h3>
        <p className="max-w-md text-sm leading-snug text-[color:var(--exp-muted)]">
          The handler from the chapter. The flag is checked before the recommendation call. That call takes one of 40 connections.
        </p>
      </div>
      {program && onEdit ? <RunningCode program={program} onEdit={onEdit} part="inputs" /> : null}
      <Ch1CodeEditor source={source} highlightLine={hl} onChange={onSource} />
      {program && onEdit ? <RunningCode program={program} onEdit={onEdit} part="trace" /> : null}
    </div>
  );
}

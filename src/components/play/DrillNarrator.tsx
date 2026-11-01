"use client";

import type { DrillNarratorFrame } from "@/lib/play/narrator";

/** Live state for a Play drill. The sentence updates in place. */
export function DrillNarrator({ frame }: { frame: DrillNarratorFrame }) {
  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label="Live drill state"
      data-tone={frame.tone === "warn" ? "warn" : undefined}
      className="drill-narrator mt-6"
    >
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="drill-live-dot" />
        <span className="sr-only">Live state</span>
      </div>
      <p className="drill-narrator-chain mt-2">{frame.chain}</p>
      <p className="mt-2 text-xs leading-relaxed text-[color:var(--drill-muted)]">
        {frame.goodLooksLike}
      </p>
    </aside>
  );
}

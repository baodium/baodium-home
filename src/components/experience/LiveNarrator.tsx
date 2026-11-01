"use client";

import { narrateChapter1 } from "@/lib/experience/narrator";
import type { EngineSnapshot } from "@/lib/experience/types";

/**
 * Plain-English chain of the live lab state.
 * Text updates in place. The status dot does not pulse.
 */
export function LiveNarrator({ snap }: { snap: EngineSnapshot }) {
  const frame = narrateChapter1(snap);

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label="Live system state"
      data-tone={frame.tone === "warn" ? "warn" : undefined}
      className="exp-narrator"
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="inline-block size-1.5 rounded-full bg-[color:var(--exp-amber)]"
        />
        <span className="sr-only">Live state</span>
      </div>
      <p className="mt-2 text-[0.98rem] leading-snug text-[color:var(--exp-fg)] tabular-nums">
        {frame.segments.map((seg, i) => (
          <span key={`${i}-${seg}`}>
            {i > 0 ? (
              <span className="text-[color:var(--exp-faint)]" aria-hidden="true">
                {" "}
                →{" "}
              </span>
            ) : null}
            {seg}
          </span>
        ))}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-[color:var(--exp-muted)]">
        {frame.goodLooksLike}
      </p>
    </aside>
  );
}

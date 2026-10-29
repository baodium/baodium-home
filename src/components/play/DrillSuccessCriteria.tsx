"use client";

import type { CriterionLive } from "@/lib/play/success-criteria";

/**
 * Exact pass/fail checklist. Shows measurable rules without naming the fix.
 */
export function DrillSuccessCriteria({
  items,
  windowSec,
  running = false,
}: {
  items: CriterionLive[];
  windowSec: number;
  running?: boolean;
}) {
  return (
    <section
      className="rounded-2xl border border-[color:var(--drill-line)] bg-[color:var(--drill-panel)] p-4 sm:p-5"
      aria-label="Success criteria"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="drill-section-title">Pass / fail</h2>
        <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[color:var(--drill-faint)]">
          {running ? "Live" : "Exact"} · {windowSec}s window
        </p>
      </div>
      <ul className="mt-4 space-y-3">
        {items.map((item) => {
          const toneClass =
            item.met === true
              ? "border-[color-mix(in_srgb,var(--drill-signal)_40%,transparent)] bg-[color-mix(in_srgb,var(--drill-signal)_8%,var(--drill-panel))]"
              : item.met === false
                ? "border-[color-mix(in_srgb,var(--drill-accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--drill-accent)_8%,var(--drill-panel))]"
                : "border-[color:var(--drill-line)] bg-[color:var(--drill-panel-soft)]";
          const mark =
            item.met === true ? "Pass" : item.met === false ? "Fail" : "—";
          const markColor =
            item.met === true
              ? "text-[color:var(--drill-signal)]"
              : item.met === false
                ? "text-[color:var(--drill-accent)]"
                : "text-[color:var(--drill-faint)]";
          return (
            <li
              key={item.id}
              className={`rounded-xl border px-3.5 py-3 ${toneClass}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium text-[color:var(--drill-fg)]">
                  {item.label}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="tabular-nums text-[0.92rem] text-[color:var(--drill-fg)]">
                    {item.value}
                  </span>
                  <span
                    className={`font-mono text-[0.58rem] uppercase tracking-[0.14em] ${markColor}`}
                  >
                    {mark}
                  </span>
                </div>
              </div>
              <p className="mt-1.5 text-[0.86rem] leading-relaxed text-[color:var(--drill-muted)]">
                {item.rule}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

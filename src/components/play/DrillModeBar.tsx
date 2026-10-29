"use client";

import type { DrillMode } from "@/lib/play/success-criteria";

/**
 * Practice = full teaching prose. Challenge = exact metrics, no recommended fix.
 */
export function DrillModeBar({
  mode,
  onChange,
  disabled = false,
}: {
  mode: DrillMode;
  onChange: (mode: DrillMode) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="inline-flex rounded-full border border-[color:var(--drill-line)] bg-[color:var(--drill-panel)] p-1"
      role="group"
      aria-label="Drill mode"
    >
      {(
        [
          { id: "practice", label: "Practice" },
          { id: "challenge", label: "Challenge" },
        ] as const
      ).map((opt) => {
        const active = mode === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.id)}
            className={`min-h-9 rounded-full px-3.5 text-sm transition-colors disabled:opacity-50 ${
              active
                ? "bg-[color:var(--drill-fg)] text-[color:var(--drill-panel)]"
                : "text-[color:var(--drill-muted)] hover:text-[color:var(--drill-fg)]"
            }`}
            aria-pressed={active}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

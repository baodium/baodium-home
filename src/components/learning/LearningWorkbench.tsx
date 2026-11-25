"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Viz-dominant workbench.
 * The live canvas is the wide first column. The teaching rail is the narrow
 * sticky column beside it. Maximize expands both into a full-viewport lab.
 */
export function LearningWorkbench({
  rail,
  canvas,
  className = "",
  label = "Lab workspace",
  expandable = true,
}: {
  rail: ReactNode;
  canvas: ReactNode;
  className?: string;
  label?: string;
  /** When false, parent chrome owns expand (e.g. embedded chapter stage). */
  expandable?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expandable || !expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [expanded, expandable]);

  return (
    <div
      className={`learn-workbench mt-8 ${className}`}
      data-expanded={expandable && expanded ? "true" : "false"}
    >
      {expandable ? (
        <div className="learn-workbench-chrome" role="toolbar" aria-label={label}>
          <p>{expanded ? "Full workspace" : "Split workspace"}</p>
          <button
            type="button"
            aria-pressed={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Exit full screen" : "Maximize"}
          </button>
        </div>
      ) : null}
      <div className="learn-workbench-grid">
        <div className="learn-canvas min-w-0 space-y-6 md:space-y-7">{canvas}</div>
        <aside className="learn-rail min-w-0 space-y-4 overscroll-contain pr-0.5 lg:pr-1">
          {rail}
        </aside>
      </div>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";

/**
 * Viz-dominant workbench.
 * The live canvas is the wide first column. The teaching rail is the narrow
 * sticky column beside it, and it follows the chart on small screens.
 */
export function LearningWorkbench({
  rail,
  canvas,
  className = "",
}: {
  rail: ReactNode;
  canvas: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`learn-workbench mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,0.7fr)] lg:gap-12 ${className}`}
    >
      <div className="learn-canvas min-w-0 space-y-5">{canvas}</div>
      <aside className="learn-rail min-w-0 space-y-4 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
        {rail}
      </aside>
    </div>
  );
}

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
      className={`learn-workbench mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1.9fr)_minmax(17.5rem,0.62fr)] lg:gap-6 ${className}`}
    >
      <div className="learn-canvas min-w-0 space-y-4">{canvas}</div>
      <aside className="learn-rail min-w-0 space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
        {rail}
      </aside>
    </div>
  );
}

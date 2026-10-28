"use client";

import type { ReactNode } from "react";

/**
 * Shared workbench layout: sticky teaching rail + live system canvas.
 * Used by Chapter labs (and later drills that need the same shell).
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
      className={`learn-workbench mt-8 grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.4fr)] ${className}`}
    >
      <aside className="learn-rail space-y-4 lg:sticky lg:top-4 lg:self-start">{rail}</aside>
      <div className="learn-canvas space-y-4">{canvas}</div>
    </div>
  );
}

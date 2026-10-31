"use client";

import { Segmented } from "@/components/ui/Segmented";
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
    <Segmented
      label="Drill mode"
      layoutId="drill-mode"
      value={mode}
      onChange={onChange}
      options={[
        { id: "practice", label: "Practice", disabled },
        { id: "challenge", label: "Challenge", disabled },
      ]}
    />
  );
}

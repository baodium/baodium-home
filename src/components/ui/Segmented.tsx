"use client";

import { motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

export type SegmentOption<T extends string> = {
  id: T;
  label: string;
  disabled?: boolean;
  title?: string;
};

/**
 * Sliding-pill control. One spring, no wash.
 * layoutId must be unique on the page so pills do not cross controls.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  layoutId,
  size = "md",
  className = "",
}: {
  value: T;
  onChange: (id: T) => void;
  options: readonly SegmentOption<T>[];
  label: string;
  layoutId: string;
  size?: "md" | "sm";
  className?: string;
}) {
  const reduce = usePrefersReducedMotion();

  return (
    <div
      className={`seg ${size === "sm" ? "seg-sm" : ""} ${className}`}
      role="group"
      aria-label={label}
    >
      {options.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            disabled={option.disabled}
            title={option.title}
            aria-pressed={active}
            onClick={() => {
              if (option.disabled) return;
              onChange(option.id);
            }}
            className="seg-btn"
          >
            {active ? (
              <motion.span
                layoutId={reduce ? undefined : layoutId}
                className="seg-pill"
                initial={false}
                transition={
                  reduce
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 480, damping: 36 }
                }
              />
            ) : null}
            <span className={`seg-label ${active ? "is-active" : ""}`}>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

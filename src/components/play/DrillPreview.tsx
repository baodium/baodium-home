"use client";

import { motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

/** Tiny animated glyph that hints at each drill’s failure mode. */
export function DrillPreview({
  kind,
  active = true,
}: {
  kind: "slo" | "surge" | "cascade" | "cache" | "tail";
  active?: boolean;
}) {
  const reduce = usePrefersReducedMotion();
  const run = active && !reduce;

  if (kind === "slo") {
    return (
      <svg viewBox="0 0 120 56" className="h-full w-full" aria-hidden="true">
        <motion.rect
          x="8"
          y="28"
          width="28"
          height="20"
          rx="2"
          className="fill-amber/35"
          animate={run ? { height: [12, 20, 16, 20], y: [36, 28, 32, 28] } : undefined}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.rect
          x="46"
          y="18"
          width="28"
          height="30"
          rx="2"
          className="fill-cream/25"
          animate={run ? { height: [22, 30, 18, 30], y: [26, 18, 30, 18] } : undefined}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        />
        <motion.rect
          x="84"
          y="10"
          width="28"
          height="38"
          rx="2"
          className="fill-cinnabar/55"
          animate={run ? { height: [28, 38, 24, 38], y: [20, 10, 24, 10] } : undefined}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        />
        <line x1="4" y1="8" x2="116" y2="8" className="stroke-amber/40" strokeWidth="1" strokeDasharray="3 3" />
      </svg>
    );
  }

  if (kind === "surge") {
    return (
      <svg viewBox="0 0 120 56" className="h-full w-full" aria-hidden="true">
        <motion.path
          d="M4 44 C 22 44, 28 40, 40 34 S 58 18, 72 16 S 96 22, 116 8"
          fill="none"
          className="stroke-amber"
          strokeWidth="2"
          strokeLinecap="round"
          initial={false}
          animate={run ? { pathLength: [0.35, 1, 0.55, 1] } : { pathLength: 1 }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.circle
          cx="72"
          cy="16"
          r="3.5"
          className="fill-cream"
          animate={run ? { opacity: [0.4, 1, 0.5, 1] } : undefined}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
    );
  }

  if (kind === "cascade") {
    const nodes = [
      { x: 20, y: 16 },
      { x: 60, y: 16 },
      { x: 100, y: 16 },
      { x: 40, y: 40 },
      { x: 80, y: 40 },
    ];
    return (
      <svg viewBox="0 0 120 56" className="h-full w-full" aria-hidden="true">
        <motion.line
          x1="20"
          y1="16"
          x2="60"
          y2="16"
          className="stroke-cream/30"
          strokeWidth="1.5"
          animate={run ? { opacity: [0.25, 0.9, 0.25] } : undefined}
          transition={{ duration: 2.4, repeat: Infinity }}
        />
        <motion.line
          x1="60"
          y1="16"
          x2="100"
          y2="16"
          className="stroke-cinnabar/50"
          strokeWidth="1.5"
          animate={run ? { opacity: [0.3, 1, 0.3] } : undefined}
          transition={{ duration: 2.4, repeat: Infinity, delay: 0.35 }}
        />
        <motion.line
          x1="60"
          y1="16"
          x2="40"
          y2="40"
          className="stroke-cream/25"
          strokeWidth="1.5"
          animate={run ? { opacity: [0.2, 0.8, 0.2] } : undefined}
          transition={{ duration: 2.4, repeat: Infinity, delay: 0.15 }}
        />
        <motion.line
          x1="60"
          y1="16"
          x2="80"
          y2="40"
          className="stroke-amber/45"
          strokeWidth="1.5"
          animate={run ? { opacity: [0.25, 0.95, 0.25] } : undefined}
          transition={{ duration: 2.4, repeat: Infinity, delay: 0.5 }}
        />
        {nodes.map((n, i) => (
          <motion.circle
            key={`${n.x}-${n.y}`}
            cx={n.x}
            cy={n.y}
            r={i === 1 ? 5 : 3.5}
            className={i === 2 ? "fill-cinnabar" : i === 1 ? "fill-amber" : "fill-cream/55"}
            animate={run ? { scale: [1, 1.25, 1] } : undefined}
            transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.12 }}
          />
        ))}
      </svg>
    );
  }

  if (kind === "cache") {
    return (
      <svg viewBox="0 0 120 56" className="h-full w-full" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <motion.rect
            key={i}
            x={12 + i * 26}
            y="14"
            width="18"
            height="28"
            rx="2"
            className={i === 2 ? "fill-cinnabar/60" : "fill-cream/20"}
            animate={
              run
                ? {
                    opacity: i === 2 ? [0.45, 1, 0.45] : [0.35, 0.7, 0.35],
                    y: i === 2 ? [14, 10, 14] : 14,
                  }
                : undefined
            }
            transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.18 }}
          />
        ))}
        <motion.circle
          cx="95"
          cy="12"
          r="4"
          className="fill-amber"
          animate={run ? { cx: [95, 21, 47, 73, 95], opacity: [0, 1, 1, 1, 0] } : undefined}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
    );
  }

  // tail
  return (
    <svg viewBox="0 0 120 56" className="h-full w-full" aria-hidden="true">
      <motion.path
        d="M4 36 C 24 36, 30 34, 44 32 S 70 30, 84 28 S 104 18, 116 8"
        fill="none"
        className="stroke-cinnabar"
        strokeWidth="2"
        strokeLinecap="round"
        animate={run ? { pathLength: [0.4, 1, 0.55, 1] } : { pathLength: 1 }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <path
        d="M4 40 C 30 40, 50 39, 70 38 S 100 37, 116 36"
        fill="none"
        className="stroke-cream/35"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line x1="4" y1="22" x2="116" y2="22" className="stroke-amber/35" strokeWidth="1" strokeDasharray="3 3" />
      <text x="100" y="18" className="fill-amber/70" fontSize="7" fontFamily="monospace">
        p99
      </text>
    </svg>
  );
}

export function previewKindForSlug(slug: string): "slo" | "surge" | "cascade" | "cache" | "tail" {
  if (slug === "slo-watch") return "slo";
  if (slug === "traffic-surge") return "surge";
  if (slug === "cascade") return "cascade";
  if (slug === "cache-roulette") return "cache";
  return "tail";
}

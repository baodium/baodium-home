"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

type Tone = "warm" | "tide" | "slate" | "moss";

const TONE: Record<
  Tone,
  { node: string; line: string; glow: string }
> = {
  warm: {
    node: "rgba(222,162,124,0.85)",
    line: "rgba(173,79,54,0.28)",
    glow: "rgba(222,162,124,0.18)",
  },
  tide: {
    node: "rgba(94,168,168,0.9)",
    line: "rgba(58,120,128,0.32)",
    glow: "rgba(94,168,168,0.16)",
  },
  slate: {
    node: "rgba(148,168,196,0.9)",
    line: "rgba(90,112,148,0.3)",
    glow: "rgba(120,140,180,0.14)",
  },
  moss: {
    node: "rgba(150,168,110,0.88)",
    line: "rgba(100,120,72,0.28)",
    glow: "rgba(140,160,100,0.14)",
  },
};

type Node = { x: number; y: number; r: number; delay: number; dur: number };

/**
 * Continuous constellation field — drifts and pulses without pointer input.
 * Honor prefers-reduced-motion with a still frame.
 */
export function AmbientField({
  tone = "warm",
  density = 18,
  className = "",
}: {
  tone?: Tone;
  density?: number;
  className?: string;
}) {
  const reduce = usePrefersReducedMotion();
  const colors = TONE[tone];
  const nodes = useMemo(() => seedNodes(density), [density]);
  const links = useMemo(() => linkNearby(nodes), [nodes]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id={`af-glow-${tone}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.glow} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {links.map(([a, b], i) => (
          <motion.line
            key={`l-${i}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={colors.line}
            strokeWidth={0.12}
            initial={false}
            animate={
              reduce
                ? { opacity: 0.35 }
                : { opacity: [0.15, 0.55, 0.2, 0.45, 0.15] }
            }
            transition={
              reduce
                ? undefined
                : {
                    duration: 5.5 + (i % 5) * 0.7,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: (i % 7) * 0.35,
                  }
            }
          />
        ))}

        {nodes.map((node, i) => (
          <motion.g
            key={`n-${i}`}
            initial={false}
            animate={
              reduce
                ? undefined
                : {
                    x: [0, (i % 2 === 0 ? 1.2 : -1) * 1.4, 0.4, 0],
                    y: [0, (i % 3 === 0 ? -1 : 1) * 1.1, 0.6, 0],
                  }
            }
            transition={
              reduce
                ? undefined
                : {
                    duration: node.dur,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: node.delay,
                  }
            }
          >
            <circle
              cx={node.x}
              cy={node.y}
              r={node.r * 4}
              fill={`url(#af-glow-${tone})`}
              opacity={0.55}
            />
            <motion.circle
              cx={node.x}
              cy={node.y}
              r={node.r}
              fill={colors.node}
              animate={
                reduce
                  ? undefined
                  : { opacity: [0.35, 1, 0.45, 0.9, 0.35], r: [node.r, node.r * 1.35, node.r] }
              }
              transition={
                reduce
                  ? undefined
                  : {
                      duration: 2.8 + (i % 4) * 0.55,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: node.delay,
                    }
              }
            />
          </motion.g>
        ))}
      </svg>
    </div>
  );
}

function seedNodes(count: number): Node[] {
  const out: Node[] = [];
  for (let i = 0; i < count; i++) {
    const t = (i + 1) / (count + 1);
    const spiral = i * 2.399963;
    out.push({
      x: 8 + ((Math.cos(spiral) * 0.5 + 0.5) * 84 + t * 12) % 84,
      y: 10 + ((Math.sin(spiral * 1.3) * 0.5 + 0.5) * 80 + (i % 5) * 7) % 80,
      r: 0.28 + (i % 4) * 0.08,
      delay: (i % 9) * 0.28,
      dur: 9 + (i % 6) * 1.4,
    });
  }
  return out;
}

function linkNearby(nodes: Node[]): Array<[Node, Node]> {
  const links: Array<[Node, Node]> = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      if (dx * dx + dy * dy < 280) links.push([nodes[i], nodes[j]]);
    }
  }
  return links.slice(0, Math.min(links.length, 28));
}

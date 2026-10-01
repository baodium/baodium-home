"use client";

import { motion } from "motion/react";

const traces = [
  "M146 900 V766 L194 718 H372",
  "M0 800 H118 L160 842 H298",
  "M520 900 V728 L562 686 H742",
  "M366 0 V62 L406 102 H612 L652 142 V262",
];

const nodes: Array<[number, number]> = [
  [372, 718],
  [298, 842],
  [742, 686],
  [652, 262],
];

export function CircuitField() {
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMinYMid slice"
      fill="none"
    >
      {traces.map((d, index) => (
        <motion.path
          key={d}
          d={d}
          stroke="rgba(245,239,229,0.11)"
          strokeWidth={1}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.8, delay: 0.35 + index * 0.09, ease: [0.65, 0, 0.35, 1] }}
        />
      ))}
      {nodes.map(([cx, cy], index) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r={2.4} fill="#f5efe5" fillOpacity={0.35} />
          <circle
            cx={cx}
            cy={cy}
            r={2.4}
            fill="#ff8a55"
            className="twinkle"
            style={
              {
                "--dur": `${2.6 + (index % 3)}s`,
                "--delay": `${index * 0.45}s`,
              } as React.CSSProperties
            }
          />
        </g>
      ))}
    </svg>
  );
}

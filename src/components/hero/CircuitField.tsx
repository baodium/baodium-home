"use client";

import { motion } from "motion/react";

const traces = [
  "M0 182 H250 L292 224 H548 L590 182 H748",
  "M84 0 V118 L124 158 H332",
  "M0 628 H176 L224 580 H414 L456 538 V386 L498 344 H690",
  "M146 900 V766 L194 718 H372",
  "M0 800 H118 L160 842 H298",
  "M520 900 V728 L562 686 H742",
  "M366 0 V62 L406 102 H612 L652 142 V262",
  "M248 300 H344 L386 258 H470",
];

const nodes: Array<[number, number]> = [
  [748, 182],
  [332, 158],
  [690, 344],
  [372, 718],
  [298, 842],
  [742, 686],
  [652, 262],
  [470, 258],
  [248, 300],
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
      <defs>
        <linearGradient id="pulse" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#ffb27a" />
          <stop offset="1" stopColor="#ec3d20" />
        </linearGradient>
      </defs>
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
      {traces.map((d, index) => (
        <path
          key={`pulse-${d}`}
          d={d}
          pathLength={1}
          stroke="url(#pulse)"
          strokeWidth={1.6}
          strokeLinecap="round"
          className="pulse-trace"
          style={
            {
              "--dur": `${5 + (index % 4) * 1.3}s`,
              "--delay": `${1.8 + index * 0.7}s`,
            } as React.CSSProperties
          }
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

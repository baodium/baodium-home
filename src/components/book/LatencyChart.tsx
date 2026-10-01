"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";

const WIDTH = 1000;
const HEIGHT = 300;
const X0 = 56;
const X1 = 930;
const BASE = 262;
const SLO = 118;

function jitter(i: number, amp: number) {
  return (Math.sin(i * 12.9898) * 43758.5453 % 1) * amp;
}

function buildPath(fn: (t: number) => number, amp: number) {
  const steps = 90;
  let d = "";
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = X0 + t * (X1 - X0);
    const y = fn(t) + jitter(i + amp * 7, amp);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  return d.trim();
}

const p50 = buildPath(() => 246, 2.4);
const p99 = buildPath((t) => 222 - 46 * t - 150 * Math.pow(t, 6), 3.2);

/** x where the p99 curve first crosses the SLO line */
const breachT = (() => {
  for (let t = 0; t <= 1; t += 0.002) {
    if (222 - 46 * t - 150 * Math.pow(t, 6) < SLO) return t;
  }
  return 1;
})();
const breachX = X0 + breachT * (X1 - X0);

export function LatencyChart() {
  const ref = useRef<HTMLDivElement>(null);
  const p99Ref = useRef<SVGPathElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.95", "center 0.45"] });
  const eased = useSpring(scrollYProgress, { stiffness: 90, damping: 26, mass: 0.4 });
  const peak = useRef(0);
  const progress = useTransform(eased, (v) => {
    if (reduce) return 1;
    peak.current = Math.max(peak.current, Math.min(Math.max(v, 0), 1));
    return peak.current;
  });

  const headX = useMotionValue(X0);
  const headY = useMotionValue(222);
  useMotionValueEvent(progress, "change", (value) => {
    const path = p99Ref.current;
    if (!path) return;
    const point = path.getPointAtLength(path.getTotalLength() * value);
    headX.set(point.x);
    headY.set(point.y);
  });

  const clipWidth = useTransform(progress, (v) => X0 + v * (X1 - X0) + 2);
  const labelOpacity = useTransform(progress, [0.88, 1], [0, 1]);
  const breachOpacity = useTransform(progress, [breachT - 0.02, breachT + 0.04], [0, 1]);
  const headOpacity = useTransform(progress, [0, 0.02, 0.97, 1], [0, 1, 1, 0]);

  return (
    <div ref={ref} className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label="Line chart: p50 latency stays flat over time while p99 latency climbs sharply and crosses the service-level objective."
      >
        <defs>
          <linearGradient id="p99-stroke" x1="0" x2="1">
            <stop offset="0" stopColor="#ff9a66" />
            <stop offset="0.6" stopColor="#ec3d20" />
            <stop offset="1" stopColor="#ff2d3a" />
          </linearGradient>
          <linearGradient id="p99-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#ec3d20" stopOpacity="0.32" />
            <stop offset="1" stopColor="#ec3d20" stopOpacity="0" />
          </linearGradient>
          <filter id="glow" x="-10%" y="-30%" width="120%" height="160%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <clipPath id="reveal-clip">
            <motion.rect x={0} y={0} height={HEIGHT} style={{ width: clipWidth }} />
          </clipPath>
        </defs>

        {[70, 130, 190].map((y) => (
          <line key={y} x1={X0} x2={X1} y1={y} y2={y} stroke="rgba(245,239,229,0.07)" strokeDasharray="2 6" />
        ))}

        <line x1={X0} x2={X1} y1={SLO} y2={SLO} stroke="rgba(255,164,92,0.5)" strokeDasharray="6 6" />
        <text x={X1 + 12} y={SLO + 4} fill="rgba(255,164,92,0.85)" className="font-mono text-[13px] max-md:text-[30px]">
          SLO
        </text>

        <line x1={X0} x2={X1} y1={BASE} y2={BASE} stroke="rgba(245,239,229,0.35)" />
        {Array.from({ length: 13 }, (_, i) => X0 + (i * (X1 - X0)) / 12).map((x, i) => (
          <line key={x} x1={x} x2={x} y1={BASE} y2={BASE + (i % 3 === 0 ? 10 : 5)} stroke="rgba(245,239,229,0.35)" />
        ))}
        <text x={X0} y={BASE + 34} fill="rgba(245,239,229,0.45)" className="font-mono text-[13px] max-md:text-[28px]">
          t−60s
        </text>
        <text x={X1} y={BASE + 34} fill="rgba(245,239,229,0.45)" textAnchor="end" className="font-mono text-[13px] max-md:text-[28px]">
          now
        </text>
        <text x={X0} y={40} fill="rgba(245,239,229,0.45)" className="font-mono text-[13px] uppercase tracking-[0.12em] max-md:text-[28px]">
          Latency
        </text>

        <g clipPath="url(#reveal-clip)">
          <path d={`${p99} L${X1} ${BASE} L${X0} ${BASE} Z`} fill="url(#p99-fill)" />
        </g>

        <motion.path d={p50} stroke="#f5efe5" strokeWidth={2.4} fill="none" strokeLinecap="round" style={{ pathLength: progress }} />
        <motion.path d={p99} stroke="#ec3d20" strokeWidth={8} fill="none" opacity={0.55} filter="url(#glow)" style={{ pathLength: progress }} />
        <motion.path
          ref={p99Ref}
          d={p99}
          stroke="url(#p99-stroke)"
          strokeWidth={2.8}
          fill="none"
          strokeLinecap="round"
          style={{ pathLength: progress }}
        />

        <motion.g style={{ opacity: breachOpacity }}>
          <line x1={breachX} x2={breachX} y1={SLO} y2={BASE} stroke="rgba(236,61,32,0.5)" strokeDasharray="2 4" />
          <circle cx={breachX} cy={SLO} r={5} fill="#ec3d20" />
          <circle cx={breachX} cy={SLO} r={5} fill="none" stroke="#ec3d20" className="origin-center [transform-box:fill-box]">
            <animate attributeName="r" values="5;18" dur="1.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.9;0" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <text x={breachX - 10} y={SLO - 16} textAnchor="end" fill="#ff8a5c" className="font-mono text-[12px] uppercase tracking-[0.12em] max-md:text-[26px]">
            Tail breach
          </text>
        </motion.g>

        <motion.circle cx={headX} cy={headY} r={5.5} fill="#fff" style={{ opacity: headOpacity }} />
        <motion.circle cx={headX} cy={headY} r={12} fill="#ec3d20" opacity={0.35} style={{ opacity: headOpacity }} />

        <motion.g style={{ opacity: labelOpacity }} className="font-mono text-[18px] font-bold max-md:text-[36px]">
          <text x={X1 + 12} y={34} fill="#ff5a3a">
            p99
          </text>
          <text x={X1 + 12} y={252} fill="#f5efe5">
            p50
          </text>
        </motion.g>
      </svg>
    </div>
  );
}

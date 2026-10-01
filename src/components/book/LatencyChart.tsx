"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

const WIDTH = 1000;
const HEIGHT = 300;
const X0 = 56;
const X1 = 930;
const BASE = 262;
const SLO = 118;
/** Illustrative scale: the SLO line sits at 300 ms. */
const SLO_MS = 300;
const STEPS = 90;

function jitter(i: number, amp: number) {
  return ((Math.sin(i * 12.9898) * 43758.5453) % 1) * amp;
}

function buildPoints(fn: (t: number) => number, amp: number) {
  return Array.from({ length: STEPS + 1 }, (_, i) => {
    const t = i / STEPS;
    return [X0 + t * (X1 - X0), fn(t) + jitter(i + amp * 7, amp)] as const;
  });
}

const toPath = (points: ReadonlyArray<readonly [number, number]>) =>
  points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");

const p99Curve = (t: number) => 222 - 46 * t - 150 * Math.pow(t, 6);
const p50Points = buildPoints(() => 246, 2.4);
const p99Points = buildPoints(p99Curve, 3.2);
const p50 = toPath(p50Points);
const p99 = toPath(p99Points);

function yAt(points: ReadonlyArray<readonly [number, number]>, t: number) {
  const f = Math.min(Math.max(t, 0), 1) * STEPS;
  const i = Math.min(Math.floor(f), STEPS - 1);
  const k = f - i;
  return points[i][1] + (points[i + 1][1] - points[i][1]) * k;
}

const toMs = (y: number) => Math.max(0, Math.round(((BASE - y) / (BASE - SLO)) * SLO_MS));

const breachT = (() => {
  for (let t = 0; t <= 1; t += 0.002) {
    if (p99Curve(t) < SLO) return t;
  }
  return 1;
})();
const breachX = X0 + breachT * (X1 - X0);
const DRIFT_T = 0.55;

type Phase = "rest" | "calm" | "drift" | "breach";

const captions: Record<Phase, { lead: string; turn: string }> = {
  rest: { lead: "The median says everything is fine.", turn: "The tail tells the truth." },
  calm: { lead: "Both percentiles look calm.", turn: "Nothing to see yet." },
  drift: { lead: "The median hasn’t moved.", turn: "The tail is already drifting." },
  breach: { lead: "The median still says everything is fine.", turn: "p99 is past the SLO." },
};

const phaseAt = (t: number): Phase => (t >= breachT ? "breach" : t >= DRIFT_T ? "drift" : "calm");

export function LatencyFigure() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = usePrefersReducedMotion();
  const [phase, setPhase] = useState<Phase>("rest");
  const [flip, setFlip] = useState(false);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.95", "center 0.45"] });
  const eased = useSpring(scrollYProgress, { stiffness: 90, damping: 26, mass: 0.4 });
  const peak = useRef(0);
  const forced = useMotionValue(0);
  const progress = useTransform(() => {
    const v = eased.get();
    if (reduce) return 1;
    peak.current = Math.max(peak.current, Math.min(Math.max(v, 0), 1), forced.get());
    return peak.current;
  });
  const clipWidth = useTransform(progress, (v) => X0 + v * (X1 - X0) + 2);
  const labelOpacity = useTransform(progress, [0.88, 1], [0, 1]);
  const breachOpacity = useTransform(progress, [breachT - 0.02, breachT + 0.04], [0, 1]);

  const scrub = useMotionValue(1);
  const shown = useMotionValue(0);
  const scrubOpacity = useSpring(shown, { stiffness: 300, damping: 30 });
  const axisOpacity = useTransform(scrubOpacity, [0, 1], [1, 0]);
  const markerX = useTransform(scrub, (t) => X0 + t * (X1 - X0));
  const y99 = useTransform(scrub, (t) => yAt(p99Points, t));
  const y50 = useTransform(scrub, (t) => yAt(p50Points, t));
  const ms99 = useTransform(y99, (y) => `p99 ${toMs(y)} ms`);
  const ms50 = useTransform(y50, (y) => `p50 ${toMs(y)} ms`);
  const clock = useTransform(scrub, (t) => (t > 0.985 ? "now" : `t−${Math.round((1 - t) * 60)}s`));
  const label99Y = useTransform(y99, (y) => y - 14);
  const label50Y = useTransform(y50, (y) => y - 12);
  const labelX = useTransform(markerX, (x) => x + (scrub.get() > 0.72 ? -14 : 14));
  const futureWidth = useTransform(markerX, (x) => Math.max(X1 + 30 - x, 0));

  useMotionValueEvent(scrub, "change", (t) => {
    if (shown.get() === 0) return;
    const next = phaseAt(t);
    setPhase((current) => (current === next ? current : next));
    const side = t > 0.72;
    setFlip((current) => (current === side ? current : side));
  });

  const moveTo = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    if (progress.get() < 0.98 && forced.get() === 0) animate(forced, 1, { duration: 0.6, ease: [0.22, 1, 0.36, 1] });
    const x = ((clientX - rect.left) / rect.width) * WIDTH;
    scrub.set(Math.min(Math.max((x - X0) / (X1 - X0), 0), 1));
    if (shown.get() === 0) {
      shown.set(1);
      setPhase(phaseAt(scrub.get()));
    }
  };

  const release = () => {
    shown.set(0);
    setPhase("rest");
  };

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.1 : 0.02;
    const keys: Record<string, number> = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step };
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      scrub.set(event.key === "Home" ? 0 : 1);
    } else if (event.key in keys) {
      event.preventDefault();
      scrub.set(Math.min(Math.max(scrub.get() + keys[event.key], 0), 1));
    } else if (event.key === "Escape") {
      release();
      return;
    } else {
      return;
    }
    shown.set(1);
    setPhase(phaseAt(scrub.get()));
  };

  const caption = captions[phase];

  return (
    <figure className="border-t border-white/10 pt-8 md:pt-12">
      <figcaption className="flex flex-col gap-4">
        <p className="kicker flex items-center justify-between gap-6 text-cream/45">
          <span>Fig. 1 — From the cover</span>
          <span className="shrink-0">
            <span className="sm:hidden">Drag to scrub</span>
            <span className="max-sm:hidden">Scrub the timeline</span>
          </span>
        </p>
        <p aria-live="polite" className="relative min-h-[2.3em] max-w-5xl font-serif text-[clamp(1.6rem,3vw,2.5rem)] leading-[1.1] text-cream md:min-h-[1.2em]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={phase}
              initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="block"
            >
              {caption.lead} <span className="italic text-flame">{caption.turn}</span>
            </motion.span>
          </AnimatePresence>
        </p>
      </figcaption>

      <div
        ref={ref}
        role="slider"
        tabIndex={0}
        aria-label="Scrub the latency timeline"
        aria-valuemin={-60}
        aria-valuemax={0}
        aria-valuenow={0}
        aria-valuetext="Drag or use arrow keys to inspect p50 and p99 over the last 60 seconds"
        onPointerMove={(event: PointerEvent<HTMLDivElement>) => moveTo(event.clientX)}
        onPointerDown={(event: PointerEvent<HTMLDivElement>) => moveTo(event.clientX)}
        onPointerLeave={release}
        onPointerCancel={release}
        onKeyDown={onKey}
        onBlur={release}
        className="relative mt-10 cursor-crosshair touch-pan-y rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-cinnabar/60 md:mt-14"
      >
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
          <text x={X1 + 12} y={SLO + 4} fill="rgba(255,164,92,0.85)" className="font-mono text-[13px] max-md:text-[28px]">
            SLO
          </text>

          <line x1={X0} x2={X1} y1={BASE} y2={BASE} stroke="rgba(245,239,229,0.35)" />
          {Array.from({ length: 13 }, (_, i) => X0 + (i * (X1 - X0)) / 12).map((x, i) => (
            <line key={x} x1={x} x2={x} y1={BASE} y2={BASE + (i % 3 === 0 ? 10 : 5)} stroke="rgba(245,239,229,0.35)" />
          ))}
          <motion.g style={{ opacity: axisOpacity }} fill="rgba(245,239,229,0.45)" className="font-mono text-[13px] max-md:text-[28px]">
            <text x={X0} y={BASE + 34}>
              t−60s
            </text>
            <text x={X1} y={BASE + 34} textAnchor="end">
              now
            </text>
          </motion.g>
          <text x={X0} y={40} fill="rgba(245,239,229,0.45)" className="font-mono text-[13px] uppercase tracking-[0.12em] max-md:text-[28px]">
            Latency
          </text>

          <g clipPath="url(#reveal-clip)">
            <path d={`${p99} L${X1} ${BASE} L${X0} ${BASE} Z`} fill="url(#p99-fill)" />
          </g>
          <motion.path d={p50} stroke="#f5efe5" strokeWidth={2.4} fill="none" strokeLinecap="round" style={{ pathLength: progress }} />
          <motion.path d={p99} stroke="#ec3d20" strokeWidth={8} fill="none" opacity={0.55} filter="url(#glow)" style={{ pathLength: progress }} />
          <motion.path d={p99} stroke="url(#p99-stroke)" strokeWidth={2.8} fill="none" strokeLinecap="round" style={{ pathLength: progress }} />

          <motion.g style={{ opacity: breachOpacity }}>
            <line x1={breachX} x2={breachX} y1={SLO} y2={BASE} stroke="rgba(236,61,32,0.5)" strokeDasharray="2 4" />
            <circle cx={breachX} cy={SLO} r={5} fill="#ec3d20" />
            <text x={breachX - 10} y={SLO - 16} textAnchor="end" fill="#ff8a5c" className="font-mono text-[12px] uppercase tracking-[0.12em] max-md:text-[26px]">
              Tail breach
            </text>
          </motion.g>

          <motion.g style={{ opacity: labelOpacity }} className="font-mono text-[18px] font-bold max-md:text-[36px]">
            <text x={X1 + 12} y={34} fill="#ff5a3a">
              p99
            </text>
            <text x={X1 + 12} y={252} fill="#f5efe5">
              p50
            </text>
          </motion.g>

          {/* The "now" marker: everything to its right is the future, so it dims. */}
          <motion.g style={{ opacity: scrubOpacity }} pointerEvents="none">
            <motion.rect x={markerX} y={0} height={BASE} width={futureWidth} fill="#0e0c0b" fillOpacity={0.62} />
            <motion.line x1={markerX} x2={markerX} y1={10} y2={BASE + 10} stroke="rgba(245,239,229,0.7)" strokeWidth={1} />
            <motion.circle cx={markerX} cy={y99} r={12} fill="#ec3d20" opacity={0.25} />
            <motion.circle cx={markerX} cy={y99} r={5} fill="#fff" stroke="#ec3d20" strokeWidth={2} />
            <motion.circle cx={markerX} cy={y50} r={4.5} fill="#0e0c0b" stroke="#f5efe5" strokeWidth={2} />
            <g className="font-mono text-[14px] max-md:text-[28px]" textAnchor={flip ? "end" : "start"}>
              <motion.text x={labelX} y={label99Y} fill="#ff8a5c">
                {ms99}
              </motion.text>
              <motion.text x={labelX} y={label50Y} fill="#f5efe5">
                {ms50}
              </motion.text>
            </g>
            <motion.text x={markerX} y={BASE + 34} textAnchor="middle" fill="#f5efe5" className="font-mono text-[13px] max-md:text-[28px]">
              {clock}
            </motion.text>
          </motion.g>
        </svg>
      </div>
    </figure>
  );
}

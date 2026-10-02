"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useInView,
  useSpring,
  useTransform,
} from "motion/react";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

const HEIGHT = 300;
const BASE = 262;
const SLO = 118;
/** Illustrative scale: the SLO line sits at 300 ms. */
const SLO_MS = 300;
const STEPS = 90;

function jitter(i: number, amp: number) {
  return ((Math.sin(i * 12.9898) * 43758.5453) % 1) * amp;
}

function buildPoints(fn: (t: number) => number, amp: number) {
  return Array.from({ length: STEPS + 1 }, (_, i) => [i / STEPS, fn(i / STEPS) + jitter(i + amp * 7, amp)] as const);
}

const toPath = (points: ReadonlyArray<readonly [number, number]>, x0: number, x1: number) =>
  points.map(([t, y], i) => `${i === 0 ? "M" : "L"}${(x0 + t * (x1 - x0)).toFixed(1)} ${y.toFixed(1)}`).join(" ");

const p99Curve = (t: number) => 222 - 46 * t - 150 * Math.pow(t, 6);
const p50Points = buildPoints(() => 246, 2.4);
const p99Points = buildPoints(p99Curve, 3.2);

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
const DRIFT_T = 0.55;

/** Phones get a narrower drawing space, so the same chart renders about twice as tall and stays scrubbable. */
function geometry(width: number, x0: number, x1: number) {
  return { WIDTH: width, X0: x0, X1: x1, p50: toPath(p50Points, x0, x1), p99: toPath(p99Points, x0, x1), breachX: x0 + breachT * (x1 - x0) };
}
type Geometry = ReturnType<typeof geometry>;
const WIDE = geometry(1000, 56, 930);
const NARROW = geometry(560, 34, 486);

const narrowQuery = "(max-width: 767px)";
const subscribeNarrow = (onChange: () => void) => {
  const media = window.matchMedia(narrowQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};

export function LatencyFigure() {
  const narrow = useSyncExternalStore(subscribeNarrow, () => window.matchMedia(narrowQuery).matches, () => false);
  return <Figure key={narrow ? "narrow" : "wide"} g={narrow ? NARROW : WIDE} />;
}

type Phase = "rest" | "calm" | "drift" | "breach";


const phaseAt = (t: number): Phase => (t >= breachT ? "breach" : t >= DRIFT_T ? "drift" : "calm");

function Figure({ g }: { g: Geometry }) {
  const { WIDTH, X0, X1, p50, p99, breachX } = g;
  const ref = useRef<HTMLDivElement>(null);
  const reduce = usePrefersReducedMotion();
  const [phase, setPhase] = useState<Phase>("rest");
  const [flip, setFlip] = useState(false);

  /** The chart draws once when it comes into view; scrolling never hides or rewinds it. */
  const progress = useMotionValue(0);
  const inView = useInView(ref, { once: true, margin: "0px 0px -20% 0px" });
  useEffect(() => {
    if (reduce) {
      progress.set(1);
      return;
    }
    if (!inView) return;
    const controls = animate(progress, 1, { duration: 1.6, ease: [0.65, 0, 0.35, 1] });
    return () => controls.stop();
  }, [inView, reduce, progress]);
  const clipWidth = useTransform(progress, (v) => X0 + v * (X1 - X0) + 2);
  const labelOpacity = useTransform(progress, [0.88, 1], [0, 1]);
  const breachOpacity = useTransform(progress, [breachT - 0.02, breachT + 0.04], [0, 1]);

  const target = useMotionValue(1);
  const scrub = useSpring(target, { stiffness: 380, damping: 38, mass: 0.6 });
  const shown = useMotionValue(0);
  const scrubOpacity = useSpring(shown, { stiffness: 300, damping: 30 });
  const axisOpacity = useTransform(scrubOpacity, [0, 1], [1, 0]);
  const restOpacity = useTransform(() => Math.min(labelOpacity.get(), 1 - scrubOpacity.get()));
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
    if (progress.get() < 0.98) animate(progress, 1, { duration: 0.5, ease: [0.22, 1, 0.36, 1] });
    window.clearTimeout(lingerRef.current);
    const x = ((clientX - rect.left) / rect.width) * WIDTH;
    const t = Math.min(Math.max((x - X0) / (X1 - X0), 0), 1);
    target.set(t);
    if (shown.get() === 0 || reduce) scrub.jump(t);
    if (shown.get() === 0) {
      shown.set(1);
      setPhase(phaseAt(t));
    }
  };

  /** Touch lifts a finger off the chart; keep the reading on screen long enough to read it. */
  const lingerRef = useRef<number | undefined>(undefined);
  const leave = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") return release();
    lingerRef.current = window.setTimeout(release, 1800);
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
      target.set(event.key === "Home" ? 0 : 1);
    } else if (event.key in keys) {
      event.preventDefault();
      target.set(Math.min(Math.max(target.get() + keys[event.key], 0), 1));
    } else if (event.key === "Escape") {
      release();
      return;
    } else {
      return;
    }
    if (reduce) scrub.jump(target.get());
    shown.set(1);
    setPhase(phaseAt(target.get()));
  };

  return (
    <figure>

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
        onPointerLeave={leave}
        onPointerCancel={release}
        onKeyDown={onKey}
        onBlur={release}
        className="relative cursor-ew-resize touch-pan-y rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-cinnabar/60 md:mt-14"
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full overflow-visible"
          role="img"
          aria-label="Line chart: p50 latency stays flat over time while p99 latency climbs sharply and crosses the service-level objective."
        >
          <defs>
            <linearGradient id="p99-stroke" x1="0" x2="1">
              <stop offset="0" stopColor="#d99474" />
              <stop offset="0.6" stopColor="#ad4f36" />
              <stop offset="1" stopColor="#a8443a" />
            </linearGradient>
            <linearGradient id="p99-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#ad4f36" stopOpacity="0.32" />
              <stop offset="1" stopColor="#ad4f36" stopOpacity="0" />
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
          <line x1={X0} x2={X1} y1={SLO} y2={SLO} stroke="rgba(222,162,124,0.5)" strokeDasharray="6 6" />
          <text x={X1 + 12} y={SLO + 4} fill="rgba(222,162,124,0.85)" className="font-mono text-[13px] max-md:text-[19px]">
            SLO
          </text>

          <line x1={X0} x2={X1} y1={BASE} y2={BASE} stroke="rgba(245,239,229,0.35)" />
          {Array.from({ length: 13 }, (_, i) => X0 + (i * (X1 - X0)) / 12).map((x, i) => (
            <line key={x} x1={x} x2={x} y1={BASE} y2={BASE + (i % 3 === 0 ? 10 : 5)} stroke="rgba(245,239,229,0.35)" />
          ))}
          <motion.g style={{ opacity: axisOpacity }} fill="rgba(245,239,229,0.45)" className="font-mono text-[13px] max-md:text-[19px]">
            <text x={X0} y={BASE + 34}>
              t−60s
            </text>
            <text x={X1} y={BASE + 34} textAnchor="end">
              now
            </text>
          </motion.g>
          <text x={X0} y={40} fill="rgba(245,239,229,0.45)" className="font-mono text-[13px] uppercase tracking-[0.12em] max-md:text-[19px]">
            Latency
          </text>

          <g clipPath="url(#reveal-clip)">
            <path d={`${p99} L${X1} ${BASE} L${X0} ${BASE} Z`} fill="url(#p99-fill)" />
          </g>
          <motion.path d={p50} stroke="#f5efe5" strokeWidth={2.4} fill="none" strokeLinecap="round" style={{ pathLength: progress }} />
          <motion.path d={p99} stroke="#ad4f36" strokeWidth={8} fill="none" opacity={0.55} filter="url(#glow)" style={{ pathLength: progress }} />
          <motion.path d={p99} stroke="url(#p99-stroke)" strokeWidth={2.8} fill="none" strokeLinecap="round" style={{ pathLength: progress }} />

          <motion.g style={{ opacity: breachOpacity }}>
            <line x1={breachX} x2={breachX} y1={SLO} y2={BASE} stroke="rgba(173,79,54,0.5)" strokeDasharray="2 4" />
            <circle cx={breachX} cy={SLO} r={5} fill="#ad4f36" />
            {phase === "breach" ? (
              <motion.circle
                cx={breachX}
                cy={SLO}
                fill="none"
                stroke="#c9664a"
                strokeWidth={2}
                initial={{ r: 5, opacity: 0.9 }}
                animate={{ r: 26, opacity: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              />
            ) : null}
            <motion.text style={{ opacity: axisOpacity }} x={breachX - 10} y={SLO - 16} textAnchor="end" fill="#dc8f6c" className="font-mono text-[12px] uppercase tracking-[0.12em] max-md:text-[17px]">
              Tail breach
            </motion.text>
          </motion.g>

          <motion.g style={{ opacity: labelOpacity }} className="font-mono text-[18px] font-bold max-md:text-[24px]">
            <text x={X1 + 12} y={34} fill="#c9664a">
              p99
            </text>
            <text x={X1 + 12} y={252} fill="#f5efe5">
              p50
            </text>
          </motion.g>

          {/* At rest, a grip on the "now" edge invites a drag back through time. */}
          <motion.g style={{ opacity: restOpacity }} pointerEvents="none">
            <line x1={X1} x2={X1} y1={60} y2={BASE} stroke="rgba(245,239,229,0.28)" strokeDasharray="3 5" />
            <rect x={X1 - 9} y={170} width={18} height={44} rx={9} fill="#3a2b23" stroke="rgba(245,239,229,0.75)" strokeWidth={1.5} />
            <line x1={X1 - 3} x2={X1 - 3} y1={183} y2={201} stroke="rgba(245,239,229,0.75)" strokeWidth={1.5} />
            <line x1={X1 + 3} x2={X1 + 3} y1={183} y2={201} stroke="rgba(245,239,229,0.75)" strokeWidth={1.5} />
            <text x={X1 - 22} y={197} textAnchor="end" fill="rgba(245,239,229,0.75)" className="font-mono text-[13px] uppercase tracking-[0.14em] max-md:text-[19px]">
              ← Drag
            </text>
          </motion.g>

          {/* The "now" marker: everything to its right is the future, so it dims. */}
          <motion.g style={{ opacity: scrubOpacity }} pointerEvents="none">
            <motion.rect x={markerX} y={0} height={BASE} width={futureWidth} fill="#3a2b23" fillOpacity={0.66} />
            <motion.line x1={markerX} x2={markerX} y1={10} y2={BASE + 10} stroke="rgba(245,239,229,0.7)" strokeWidth={1} />
            <motion.circle cx={markerX} cy={y99} r={12} fill="#ad4f36" opacity={0.25} />
            <motion.circle cx={markerX} cy={y99} r={5} fill="#fff" stroke="#ad4f36" strokeWidth={2} />
            <motion.circle cx={markerX} cy={y50} r={4.5} fill="#3a2b23" stroke="#f5efe5" strokeWidth={2} />
            <g className="font-mono text-[14px] max-md:text-[19px]" textAnchor={flip ? "end" : "start"}>
              <motion.text x={labelX} y={label99Y} fill="#dc8f6c">
                {ms99}
              </motion.text>
              <motion.text x={labelX} y={label50Y} fill="#f5efe5">
                {ms50}
              </motion.text>
            </g>
            <motion.text x={markerX} y={BASE + 34} textAnchor="middle" fill="#f5efe5" className="font-mono text-[13px] max-md:text-[19px]">
              {clock}
            </motion.text>
          </motion.g>
        </svg>
      </div>
    </figure>
  );
}

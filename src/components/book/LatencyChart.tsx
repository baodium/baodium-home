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

/** Illustrative scale: the SLO line sits at 300 ms. */
const SLO_MS = 300;
const STEPS = 90;
const SLO_NORM = 0.4;
const P50_NORM = 0.93;

function jitter(i: number, amp: number) {
  const n = Math.sin(i * 12.9898) * 43758.5453;
  return (n - Math.floor(n)) * amp;
}

/** 0 sits on the baseline, 1 sits at the top of the plot. The tail climbs late. */
function p99Norm(t: number) {
  return 0.16 + 0.12 * t + 0.68 * Math.pow(t, 6);
}

const breachT = (() => {
  for (let t = 0; t <= 1; t += 0.002) {
    if (p99Norm(t) > 1 - SLO_NORM) return t;
  }
  return 1;
})();
const DRIFT_T = 0.55;

type Point = readonly [number, number];

type Geometry = {
  WIDTH: number;
  HEIGHT: number;
  X0: number;
  X1: number;
  TOP: number;
  BASE: number;
  SLO: number;
  font: number;
  stroke: number;
  p50: string;
  p99: string;
  breachX: number;
  points50: ReadonlyArray<Point>;
  points99: ReadonlyArray<Point>;
};

function buildPoints(fn: (t: number) => number, amp: number) {
  return Array.from({ length: STEPS + 1 }, (_, i) => [i / STEPS, fn(i / STEPS) + jitter(i + amp * 7, amp)] as const);
}

function toPath(points: ReadonlyArray<readonly [number, number]>, x0: number, x1: number) {
  return points.map(([t, y], i) => `${i === 0 ? "M" : "L"}${(x0 + t * (x1 - x0)).toFixed(1)} ${y.toFixed(1)}`).join(" ");
}

function yAt(points: ReadonlyArray<readonly [number, number]>, t: number) {
  const f = Math.min(Math.max(t, 0), 1) * STEPS;
  const i = Math.min(Math.floor(f), STEPS - 1);
  const k = f - i;
  return points[i][1] + (points[i + 1][1] - points[i][1]) * k;
}

function geometry(width: number, height: number, x0: number, x1: number, font: number, stroke: number): Geometry {
  const TOP = Math.round(height * 0.2);
  const BASE = Math.round(height * 0.84);
  const plot = BASE - TOP;
  const yOf = (fromBase: number) => BASE - fromBase * plot;
  const amp = plot * 0.012;
  const points50 = buildPoints(() => yOf(1 - P50_NORM), amp * 0.7);
  const points99 = buildPoints((t) => yOf(p99Norm(t)), amp);
  return {
    WIDTH: width,
    HEIGHT: height,
    X0: x0,
    X1: x1,
    TOP,
    BASE,
    SLO: yOf(1 - SLO_NORM),
    font,
    stroke,
    p50: toPath(points50, x0, x1),
    p99: toPath(points99, x0, x1),
    breachX: x0 + breachT * (x1 - x0),
    points50,
    points99,
  };
}

const WIDE = geometry(1080, 400, 56, 980, 15, 2.8);
const MID = geometry(780, 460, 40, 700, 20, 3.4);
const NARROW = geometry(520, 480, 28, 400, 22, 3.8);

function sizeOf(width: number) {
  if (width < 640) return "narrow" as const;
  if (width < 1100) return "mid" as const;
  return "wide" as const;
}

const plots: Record<"wide" | "mid" | "narrow", Geometry> = { wide: WIDE, mid: MID, narrow: NARROW };

function subscribeSize(onChange: () => void) {
  const narrow = window.matchMedia("(max-width: 639px)");
  const mid = window.matchMedia("(max-width: 1099px)");
  narrow.addEventListener("change", onChange);
  mid.addEventListener("change", onChange);
  return () => {
    narrow.removeEventListener("change", onChange);
    mid.removeEventListener("change", onChange);
  };
}

export function LatencyFigure() {
  const size = useSyncExternalStore(subscribeSize, () => sizeOf(window.innerWidth), () => "wide" as const);
  return <Figure key={size} g={plots[size]} />;
}

type Phase = "rest" | "calm" | "drift" | "breach";

const phaseAt = (t: number): Phase => (t >= breachT ? "breach" : t >= DRIFT_T ? "drift" : "calm");

function Figure({ g }: { g: Geometry }) {
  const { WIDTH, HEIGHT, X0, X1, TOP, BASE, SLO, font, stroke, p50, p99, breachX, points50, points99 } = g;
  const ref = useRef<HTMLDivElement>(null);
  const reduce = usePrefersReducedMotion();
  const [phase, setPhase] = useState<Phase>("rest");
  const [second, setSecond] = useState(0);

  const toMs = (y: number) => Math.max(0, Math.round(((BASE - y) / (BASE - SLO)) * SLO_MS));

  /** The chart draws once when it comes into view; scrolling never hides or rewinds it. */
  const progress = useMotionValue(0);
  const inView = useInView(ref, { once: true, margin: "0px 0px 16% 0px" });
  useEffect(() => {
    if (reduce) {
      progress.set(1);
      return;
    }
    if (!inView) return;
    const controls = animate(progress, 1, { duration: 1.15, ease: [0.65, 0, 0.35, 1] });
    return () => controls.stop();
  }, [inView, reduce, progress]);
  const clipWidth = useTransform(progress, (v) => X0 + v * (X1 - X0) + 2);
  const labelOpacity = useTransform(progress, [0.86, 1], [0, 1]);
  const breachOpacity = useTransform(progress, [breachT - 0.02, breachT + 0.04], [0, 1]);

  const target = useMotionValue(1);
  const scrub = useSpring(target, { stiffness: 520, damping: 42, mass: 0.35 });
  const shown = useMotionValue(0);
  const scrubOpacity = useSpring(shown, { stiffness: 340, damping: 32 });
  const axisOpacity = useTransform(scrubOpacity, [0, 1], [1, 0]);
  const restOpacity = useTransform(() => Math.min(labelOpacity.get(), 1 - scrubOpacity.get()));
  const markerX = useTransform(scrub, (t) => X0 + t * (X1 - X0));
  const y99 = useTransform(scrub, (t) => yAt(points99, t));
  const y50 = useTransform(scrub, (t) => yAt(points50, t));
  const ms99 = useTransform(y99, (y) => `p99  ${toMs(y)} ms`);
  const ms50 = useTransform(y50, (y) => `p50  ${toMs(y)} ms`);
  const clock = useTransform(scrub, (t) => (t > 0.985 ? "now" : `t−${Math.round((1 - t) * 60)}s`));
  const readX = useTransform(markerX, (x) => Math.min(Math.max(x, X0 + font * 4.2), X1 - font * 7.2));
  const futureWidth = useTransform(markerX, (x) => Math.max(X1 - x, 0));
  const gridYs = [0.22, 0.62].map((n) => TOP + n * (BASE - TOP));
  const gripH = font * 2.6;
  const gripW = font * 0.95;

  useMotionValueEvent(scrub, "change", (t) => {
    if (shown.get() === 0) return;
    const next = phaseAt(t);
    setPhase((current) => (current === next ? current : next));
    const sec = t > 0.985 ? 0 : -Math.round((1 - t) * 60);
    setSecond((current) => (current === sec ? current : sec));
  });

  const moveTo = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    if (progress.get() < 0.98) animate(progress, 1, { duration: 0.35, ease: [0.22, 1, 0.36, 1] });
    window.clearTimeout(lingerRef.current);
    const x = ((clientX - rect.left) / rect.width) * WIDTH;
    const t = Math.min(Math.max((x - X0) / (X1 - X0), 0), 1);
    target.set(t);
    if (shown.get() === 0 || reduce) scrub.jump(t);
    if (shown.get() === 0) {
      shown.set(1);
      setPhase(phaseAt(t));
      setSecond(t > 0.985 ? 0 : -Math.round((1 - t) * 60));
    }
  };

  /** Touch lifts a finger off the chart; keep the reading on screen long enough to read it. */
  const lingerRef = useRef<number | undefined>(undefined);
  const leave = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") return release();
    lingerRef.current = window.setTimeout(release, 1600);
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
    const t = target.get();
    setPhase(phaseAt(t));
    setSecond(t > 0.985 ? 0 : -Math.round((1 - t) * 60));
  };

  return (
    <figure>
      <figcaption className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <p className="font-serif text-[clamp(1.35rem,2vw,1.7rem)] italic leading-tight text-cream/88">One minute of tail latency</p>
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-cream/50">p50 holds. p99 crosses 300 ms.</p>
      </figcaption>
      <div
        ref={ref}
        role="slider"
        tabIndex={0}
        aria-label="Scrub the latency timeline"
        aria-valuemin={-60}
        aria-valuemax={0}
        aria-valuenow={second}
        aria-valuetext="Drag or use arrow keys to inspect p50 and p99 over the last 60 seconds"
        onPointerMove={(event: PointerEvent<HTMLDivElement>) => moveTo(event.clientX)}
        onPointerDown={(event: PointerEvent<HTMLDivElement>) => moveTo(event.clientX)}
        onPointerLeave={leave}
        onPointerCancel={release}
        onKeyDown={onKey}
        onBlur={release}
        className="relative cursor-ew-resize touch-pan-y rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-cinnabar/60"
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full"
          role="img"
          aria-label="Line chart: p50 latency stays flat over time while p99 latency climbs sharply and crosses the service-level objective."
        >
          <defs>
            <linearGradient id={`p99-stroke-${WIDTH}`} x1="0" x2="1">
              <stop offset="0" stopColor="#e0b08e" />
              <stop offset="0.55" stopColor="#c46a4c" />
              <stop offset="1" stopColor="#ad4f36" />
            </linearGradient>
            <linearGradient id={`p99-fill-${WIDTH}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#ad4f36" stopOpacity="0.38" />
              <stop offset="1" stopColor="#ad4f36" stopOpacity="0" />
            </linearGradient>
            <filter id={`glow-${WIDTH}`} x="-10%" y="-30%" width="120%" height="160%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
            <clipPath id={`reveal-clip-${WIDTH}`}>
              <motion.rect x={0} y={0} height={HEIGHT} style={{ width: clipWidth }} />
            </clipPath>
          </defs>

          {gridYs.map((y) => (
            <line key={y} x1={X0} x2={X1} y1={y} y2={y} stroke="rgba(245,239,229,0.08)" strokeDasharray="2 7" />
          ))}
          <line x1={X0} x2={X1} y1={SLO} y2={SLO} stroke="rgba(222,162,124,0.55)" strokeDasharray="6 6" />
          <text x={X1 + font * 0.7} y={SLO + font * 0.32} fill="rgba(222,162,124,0.9)" fontSize={font} className="font-mono">
            SLO
          </text>

          <line x1={X0} x2={X1} y1={BASE} y2={BASE} stroke="rgba(245,239,229,0.38)" />
          {Array.from({ length: 13 }, (_, i) => X0 + (i * (X1 - X0)) / 12).map((x, i) => (
            <line key={x} x1={x} x2={x} y1={BASE} y2={BASE + (i % 3 === 0 ? font * 0.7 : font * 0.35)} stroke="rgba(245,239,229,0.38)" />
          ))}
          <motion.g style={{ opacity: axisOpacity }} fill="rgba(245,239,229,0.55)" className="font-mono">
            <text x={X0} y={BASE + font * 2.1} fontSize={font}>
              t−60s
            </text>
            <text x={X1} y={BASE + font * 2.1} textAnchor="end" fontSize={font}>
              now
            </text>
          </motion.g>
          <motion.text x={X0} y={font * 1.35} fill="rgba(245,239,229,0.5)" fontSize={font * 0.85} className="font-mono uppercase" style={{ letterSpacing: "0.14em", opacity: restOpacity }}>
            Latency
          </motion.text>

          <g clipPath={`url(#reveal-clip-${WIDTH})`}>
            <path d={`${p99} L${X1} ${BASE} L${X0} ${BASE} Z`} fill={`url(#p99-fill-${WIDTH})`} />
          </g>
          <motion.path d={p50} stroke="#f5efe5" strokeWidth={Math.max(2, stroke * 0.75)} fill="none" strokeLinecap="round" style={{ pathLength: progress }} />
          <motion.path d={p99} stroke="#ad4f36" strokeWidth={stroke * 2.4} fill="none" opacity={0.45} filter={`url(#glow-${WIDTH})`} style={{ pathLength: progress }} />
          <motion.path d={p99} stroke={`url(#p99-stroke-${WIDTH})`} strokeWidth={stroke} fill="none" strokeLinecap="round" style={{ pathLength: progress }} />

          <motion.g style={{ opacity: breachOpacity }}>
            <line x1={breachX} x2={breachX} y1={SLO} y2={BASE} stroke="rgba(173,79,54,0.55)" strokeDasharray="2 4" />
            <circle cx={breachX} cy={SLO} r={font * 0.32} fill="#ad4f36" />
            {phase === "breach" ? (
              <motion.circle
                cx={breachX}
                cy={SLO}
                fill="none"
                stroke="#e0a080"
                strokeWidth={2}
                initial={{ r: font * 0.32, opacity: 0.9 }}
                animate={{ r: font * 1.7, opacity: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              />
            ) : null}
            <motion.text
              style={{ opacity: restOpacity }}
              x={Math.max(X0, breachX - font * 0.7)}
              y={SLO - font}
              textAnchor="end"
              fill="#e0b08e"
              fontSize={font * 0.8}
              className="font-mono uppercase"
            >
              Tail breach
            </motion.text>
          </motion.g>

          <motion.g style={{ opacity: restOpacity }} className="font-mono">
            <text x={X1 + font * 0.7} y={TOP + font} fill="#e0a080" fontSize={font}>
              p99
            </text>
            <text x={X1 + font * 0.7} y={BASE - font * 0.4} fill="#f5efe5" fontSize={font}>
              p50
            </text>
          </motion.g>

          <motion.g style={{ opacity: restOpacity }} pointerEvents="none">
            <line x1={X1} x2={X1} y1={TOP} y2={BASE} stroke="rgba(245,239,229,0.28)" strokeDasharray="3 5" />
            <rect x={X1 - gripW / 2} y={(TOP + BASE) / 2 - gripH / 2} width={gripW} height={gripH} rx={gripW / 2} fill="#3a2b23" stroke="rgba(245,239,229,0.8)" strokeWidth={1.5} />
            <text x={X1 - gripW} y={(TOP + BASE) / 2 + font * 0.32} textAnchor="end" fill="rgba(245,239,229,0.78)" fontSize={font * 0.82} className="font-mono uppercase">
              Drag
            </text>
          </motion.g>

          <motion.g style={{ opacity: scrubOpacity }} pointerEvents="none">
            <motion.rect x={markerX} y={TOP - 8} height={BASE - TOP + 8} width={futureWidth} fill="#3a2b23" fillOpacity={0.55} />
            <motion.line x1={markerX} x2={markerX} y1={TOP} y2={BASE + 8} stroke="rgba(245,239,229,0.8)" strokeWidth={1.25} />
            <motion.circle cx={markerX} cy={y99} r={font * 0.85} fill="#ad4f36" opacity={0.28} />
            <motion.circle cx={markerX} cy={y99} r={font * 0.34} fill="#fff" stroke="#ad4f36" strokeWidth={2} />
            <motion.circle cx={markerX} cy={y50} r={font * 0.3} fill="#3a2b23" stroke="#f5efe5" strokeWidth={2} />
            <motion.text x={readX} y={font * 1.35} textAnchor="middle" fill="#f0c2a4" fontSize={font} className="font-mono">
              {ms99}
            </motion.text>
            <motion.text x={readX} y={font * 2.7} textAnchor="middle" fill="#f5efe5" fontSize={font} className="font-mono">
              {ms50}
            </motion.text>
            <motion.text x={markerX} y={BASE + font * 2.1} textAnchor="middle" fill="#f5efe5" fontSize={font} className="font-mono">
              {clock}
            </motion.text>
          </motion.g>
        </svg>
      </div>
    </figure>
  );
}

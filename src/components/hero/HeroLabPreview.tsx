"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight } from "lucide-react";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

const NODES = [
  { id: "client", label: "Client" },
  { id: "product", label: "Product" },
  { id: "recs", label: "Recs" },
  { id: "pool", label: "Pool" },
  { id: "db", label: "DB" },
] as const;

type Phase = {
  active: number;
  pool: number;
  waitMs: number;
  p99: number;
  note: string;
};

/** Autoplaying Chapter 1 path: Product → Recs → shared pool → DB. */
const PHASES: Phase[] = [
  {
    active: 0,
    pool: 8,
    waitMs: 2,
    p99: 48,
    note: "Request enters the product page.",
  },
  {
    active: 1,
    pool: 12,
    waitMs: 4,
    p99: 62,
    note: "Product page calls Recommendation.",
  },
  {
    active: 2,
    pool: 22,
    waitMs: 18,
    p99: 140,
    note: "Recommendation borrows from the shared pool.",
  },
  {
    active: 3,
    pool: 38,
    waitMs: 210,
    p99: 890,
    note: "Pool fills. Callers wait on acquire.",
  },
  {
    active: 4,
    pool: 40,
    waitMs: 640,
    p99: 2100,
    note: "DB holds connections. Tail latency climbs.",
  },
  {
    active: 3,
    pool: 28,
    waitMs: 90,
    p99: 420,
    note: "Dial back exposure. Wait time falls.",
  },
];

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Working technical preview on the homepage hero.
 * Same Chapter 1 boundary story as the lab: Recs → shared 40-conn pool → DB.
 */
export function HeroLabPreview() {
  const reduce = usePrefersReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      setStep((value) => (value + 1) % PHASES.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [reduce]);

  const phase = PHASES[reduce ? 3 : step] ?? PHASES[0];

  return (
    <div className="relative w-full max-w-[26rem] overflow-hidden rounded-2xl border border-cream/15 bg-[#1a1411]/88 shadow-[0_28px_64px_-28px_rgba(0,0,0,0.65)] backdrop-blur-md">
      <div className="flex items-center justify-between gap-3 border-b border-cream/10 px-4 py-2.5">
        <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-amber/85">
          Chapter 1 · live path
        </p>
        <p className="font-mono text-[0.62rem] tracking-[0.08em] text-cream/45">
          40-conn pool
        </p>
      </div>

      <div className="px-4 pb-4 pt-3.5">
        <div className="flex items-stretch gap-1">
          {NODES.map((node, index) => {
            const on = index === phase.active;
            const passed = index < phase.active;
            return (
              <div key={node.id} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <motion.span
                  animate={{
                    borderColor: on
                      ? "rgba(222,162,124,0.85)"
                      : passed
                        ? "rgba(245,239,229,0.22)"
                        : "rgba(245,239,229,0.1)",
                    backgroundColor: on
                      ? "rgba(173,79,54,0.28)"
                      : "rgba(245,239,229,0.04)",
                  }}
                  transition={{ duration: reduce ? 0 : 0.45, ease }}
                  className="flex h-9 w-full items-center justify-center rounded-lg border px-0.5 text-center font-mono text-[0.58rem] uppercase tracking-[0.06em] text-cream/80"
                >
                  {node.label}
                </motion.span>
                {index < NODES.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className={`h-px w-full ${
                      index < phase.active ? "bg-amber/55" : "bg-cream/12"
                    }`}
                  />
                ) : (
                  <span aria-hidden="true" className="h-px w-full bg-transparent" />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Metric label="Pool" value={`${phase.pool}/40`} warn={phase.pool >= 36} />
          <Metric label="Acquire wait" value={`${phase.waitMs} ms`} warn={phase.waitMs >= 200} />
          <Metric label="p99" value={`${phase.p99} ms`} warn={phase.p99 >= 800} />
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-cream/10">
          <motion.div
            className="h-full rounded-full bg-cinnabar"
            animate={{ width: `${(phase.pool / 40) * 100}%` }}
            transition={{ duration: reduce ? 0 : 0.55, ease }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={phase.note}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: reduce ? 0 : 0.35, ease }}
            className="mt-3 min-h-[2.6rem] text-[0.84rem] leading-snug text-cream/68"
          >
            {phase.note}
          </motion.p>
        </AnimatePresence>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-cream/10 pt-3">
          <Link
            href="/system-design/experience/chapter-1"
            className="group inline-flex min-h-9 items-center gap-1.5 text-[0.88rem] font-medium text-cream transition-colors hover:text-amber"
          >
            Open the lab
            <ArrowRight
              aria-hidden="true"
              className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
              strokeWidth={2}
            />
          </Link>
          <Link
            href="/system-design/chapter-1"
            className="inline-flex min-h-9 items-center text-[0.88rem] text-cream/60 underline decoration-cream/25 underline-offset-4 transition-colors hover:text-cream hover:decoration-cream/55"
          >
            Read chapter 1
          </Link>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-lg border border-cream/10 bg-cream/[0.04] px-2.5 py-2">
      <p className="font-mono text-[0.55rem] uppercase tracking-[0.14em] text-cream/45">
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-[0.82rem] tabular-nums ${
          warn ? "text-amber" : "text-cream/88"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

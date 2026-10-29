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
    note: "A request enters the product page.",
  },
  {
    active: 1,
    pool: 12,
    waitMs: 4,
    p99: 62,
    note: "The product page calls Recommendation.",
  },
  {
    active: 2,
    pool: 22,
    waitMs: 18,
    p99: 140,
    note: "Recommendation borrows from the shared 40-connection pool.",
  },
  {
    active: 3,
    pool: 38,
    waitMs: 210,
    p99: 890,
    note: "The pool fills. Callers wait on acquire.",
  },
  {
    active: 4,
    pool: 40,
    waitMs: 640,
    p99: 2100,
    note: "The database holds connections. Tail latency climbs.",
  },
  {
    active: 3,
    pool: 28,
    waitMs: 90,
    p99: 420,
    note: "Dial back exposure and wait time falls.",
  },
];

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Below-the-fold Chapter 1 path preview.
 * Never overlays the homepage hero portrait.
 */
export function LivePathSection() {
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
    <section
      id="live-path"
      aria-labelledby="live-path-heading"
      className="relative bg-cream px-3 text-ink md:px-5"
    >
      <div className="relative overflow-hidden border border-ink/10 bg-white">
        <div className="shell relative z-[2] grid gap-10 py-12 md:grid-cols-12 md:items-end md:gap-12 md:py-16">
          <div className="md:col-span-5 lg:col-span-4">
            <p className="kicker text-cinnabar">Chapter 1</p>
            <h2
              id="live-path-heading"
              className="mt-4 font-serif text-[clamp(1.85rem,3.6vw,2.75rem)] leading-[1.05] tracking-[-0.035em] text-ink"
            >
              The live request path.
            </h2>
            <p className="mt-4 max-w-md text-[1.02rem] leading-relaxed text-muted">
              Personalized traffic leaves the product page, borrows from a shared
              forty-connection pool, then reaches the database. Watch acquire wait
              and p99 climb as the pool fills.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link
                href="/system-design/experience/chapter-1"
                className="group inline-flex min-h-11 items-center gap-1.5 text-[0.95rem] font-medium text-ink transition-colors hover:text-cinnabar"
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
                className="inline-flex min-h-11 items-center text-[0.95rem] text-muted underline decoration-ink/20 underline-offset-4 transition-colors hover:text-ink hover:decoration-ink/45"
              >
                Read chapter 1
              </Link>
              <Link
                href="/system-design/experience"
                className="inline-flex min-h-11 items-center text-[0.95rem] text-muted underline decoration-ink/20 underline-offset-4 transition-colors hover:text-ink hover:decoration-ink/45"
              >
                All labs
              </Link>
            </div>
          </div>

          <div className="md:col-span-7 lg:col-span-8">
            <div className="overflow-hidden rounded-[1.25rem] border border-ink/10 bg-[#1a1411] text-cream md:rounded-[1.5rem]">
              <div className="flex items-center justify-between gap-3 border-b border-cream/10 px-4 py-2.5 sm:px-5">
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-amber/85">
                  Live path
                </p>
                <p className="font-mono text-[0.62rem] tracking-[0.08em] text-cream/45">
                  40-conn pool
                </p>
              </div>

              <div className="px-4 pb-5 pt-4 sm:px-5">
                <div className="flex items-stretch gap-1 sm:gap-1.5">
                  {NODES.map((node, index) => {
                    const on = index === phase.active;
                    const passed = index < phase.active;
                    return (
                      <div
                        key={node.id}
                        className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
                      >
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
                          className="flex h-10 w-full items-center justify-center rounded-lg border px-0.5 text-center font-mono text-[0.58rem] uppercase tracking-[0.06em] text-cream/80 sm:h-11 sm:text-[0.62rem]"
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

                <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
                  <Metric label="Pool" value={`${phase.pool}/40`} warn={phase.pool >= 36} />
                  <Metric
                    label="Acquire wait"
                    value={`${phase.waitMs} ms`}
                    warn={phase.waitMs >= 200}
                  />
                  <Metric label="p99" value={`${phase.p99} ms`} warn={phase.p99 >= 800} />
                </div>

                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-cream/10">
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
                    className="mt-4 min-h-[2.6rem] text-[0.92rem] leading-snug text-cream/68"
                  >
                    {phase.note}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
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
    <div className="rounded-lg border border-cream/10 bg-cream/[0.04] px-2.5 py-2.5 sm:px-3">
      <p className="font-mono text-[0.55rem] uppercase tracking-[0.14em] text-cream/45">
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-[0.88rem] tabular-nums sm:text-[0.95rem] ${
          warn ? "text-amber" : "text-cream/88"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

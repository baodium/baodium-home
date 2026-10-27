"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GameResultPanel } from "@/components/play/GameResultPanel";
import { PlayMeter } from "@/components/play/PlayMeter";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";
import {
  createTail,
  P99_BUDGET_MS,
  TAIL_DURATION_S,
  TAIL_TICK_MS,
  tickTail,
  type TailControls,
  type TailResult,
  type TailSnap,
} from "@/lib/play/tail-latency";

const initial: TailSnap = {
  t: 0,
  p50: 55,
  p95: 110,
  p99: 180,
  cost: 1,
  goodput: 1,
  message: "Quiet lane. Stragglers appear after 10s.",
};

export function TailLatencyGame() {
  const reduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState<"intro" | "running" | "won" | "lost">("intro");
  const [controls, setControls] = useState<TailControls>({
    concurrency: 24,
    hedge: false,
    hedgeAfterMs: 120,
    timeoutMs: 500,
  });
  const [snap, setSnap] = useState<TailSnap>(initial);
  const [result, setResult] = useState<TailResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [stepOverride, setStepOverride] = useState<boolean | null>(null);
  const stepMode = stepOverride ?? reduced;

  const engineRef = useRef(createTail());
  const controlsRef = useRef(controls);
  const loopRef = useRef<number | null>(null);

  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  const stop = useCallback(() => {
    if (loopRef.current !== null) {
      window.clearInterval(loopRef.current);
      loopRef.current = null;
    }
  }, []);

  const applyTick = useCallback(() => {
    const { state, snap: next, done } = tickTail(
      engineRef.current,
      controlsRef.current,
    );
    engineRef.current = state;
    setSnap(next);
    if (done) {
      stop();
      setResult(done);
      setPhase(done.outcome);
    }
  }, [stop]);

  const start = useCallback(() => {
    stop();
    engineRef.current = createTail();
    setResult(null);
    setCopied(false);
    setSnap(initial);
    setPhase("running");
    if (stepMode) {
      applyTick();
      return;
    }
    loopRef.current = window.setInterval(
      applyTick,
      reduced ? TAIL_TICK_MS * 2 : TAIL_TICK_MS,
    );
  }, [applyTick, reduced, stepMode, stop]);

  useEffect(() => () => stop(), [stop]);

  const share = async () => {
    if (!result) return;
    const url = `${typeof window !== "undefined" ? window.location.origin : "https://baodium.com"}/play/tail-latency`;
    const text = `Tail Latency on Baodium — score ${result.score}. ${result.takeaway} ${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Tail Latency — Baodium", text, url });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    }
  };

  const teach =
    phase === "intro"
      ? {
          kicker: "What you’ll do",
          body: "p50 is the median. p99 is the slow 1%. After ~10s, stragglers appear — keep p99 under the budget without drowning the fleet in hedge copies.",
          why: "Median health can hide a burning SLO. Hedging races the tail; too-early hedges inflate work cost and make everything slower.",
        }
      : phase === "running"
        ? snap.t < 10
          ? {
              kicker: "Quiet lane",
              body: "Load is steady. Watch p50 stay calm — the test starts when stragglers arrive.",
              why: "Early calm is not success. Hold the dials for the window that actually stresses the tail.",
            }
          : snap.p99 > P99_BUDGET_MS * 0.9
            ? {
                kicker: "Tail under fire",
                body: `p99 is near or over ${P99_BUDGET_MS}ms. Concurrency pressure and late hedges fight each other — cut blast, hedge late, or tighten timeout.`,
                why: "Duplicate work buys latency only if the original request was truly stuck. Early hedges burn capacity.",
              }
            : {
                kicker: "Stragglers live",
                body: snap.message,
                why: "You’re trading concurrency, hedge delay, and timeout against work cost. Read p99 and cost together.",
              }
        : phase === "won"
          ? {
              kicker: "Tail held",
              body: "p99 stayed inside the budget. Notice the work-cost multiplier — a win that doubles load is a fragile win.",
              why: "Good hedging is late and selective. The lesson carries into Chapter 2’s latency models.",
            }
          : {
              kicker: "Tail blew",
              body: result?.reason ?? "p99 escaped the budget or cost ran away.",
              why: result?.takeaway ?? "Rebalance concurrency and hedge timing — then run again.",
            };

  return (
    <div className="slo-game">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-sans text-[0.72rem] font-medium uppercase tracking-[0.22em] text-amber">
            Play · Tail Latency
          </p>
          <h1 className="mt-3 max-w-xl font-serif text-3xl tracking-[-0.02em] md:text-4xl">
            p50 looks fine. p99 does not.
          </h1>
          <p className="mt-4 max-w-xl text-[0.98rem] leading-relaxed text-cream/65">
            Stragglers hit after 10s. Hedge carefully — duplicate work costs
            capacity. Hold p99 under {P99_BUDGET_MS}ms for {TAIL_DURATION_S}s.
          </p>
        </div>
      </div>

      <aside
        role="note"
        aria-live="polite"
        className="mt-8 grid gap-3 rounded-2xl border border-amber/25 bg-gradient-to-br from-cinnabar/15 via-night/40 to-transparent p-4 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)] sm:gap-6 sm:p-5"
      >
        <div>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-amber">{teach.kicker}</p>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-cream/85">{teach.body}</p>
        </div>
        <div className="border-t border-white/10 pt-3 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-cream/45">Why it matters</p>
          <p className="mt-2 text-sm leading-relaxed text-cream/65">{teach.why}</p>
        </div>
      </aside>

      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <div className="border border-white/12 bg-night/55 p-5 md:p-6 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.72rem] uppercase tracking-[0.18em] text-cream/45">
              {phase === "intro"
                ? "Ready"
                : phase === "running"
                  ? `${snap.t.toFixed(1)}s`
                  : phase === "won"
                    ? "Tail held"
                    : "Tail blew"}
            </p>
            <p className="max-w-sm text-right text-sm text-cream/65">{snap.message}</p>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <PlayMeter
              label="p50"
              value={snap.p50}
              max={P99_BUDGET_MS}
              format={(n) => `${n.toFixed(0)} ms`}
              warnAt={0.35}
              dangerAt={0.55}
            />
            <PlayMeter
              label="p95"
              value={snap.p95}
              max={P99_BUDGET_MS}
              format={(n) => `${n.toFixed(0)} ms`}
              warnAt={0.7}
              dangerAt={0.9}
            />
            <PlayMeter
              label="p99"
              value={snap.p99}
              max={P99_BUDGET_MS}
              format={(n) => `${n.toFixed(0)} ms`}
              warnAt={0.85}
              dangerAt={1}
            />
            <PlayMeter
              label="Work cost"
              value={snap.cost}
              max={2}
              format={(n) => `${n.toFixed(2)}×`}
              warnAt={0.7}
              dangerAt={0.9}
            />
          </div>
          {(phase === "won" || phase === "lost") && result ? (
            <GameResultPanel
              outcome={result.outcome}
              score={result.score}
              reason={result.reason}
              takeaway={result.takeaway}
              chapterHref={result.chapterHref}
              chapterLabel={result.chapterLabel}
              onAgain={start}
              onShare={share}
              copied={copied}
            />
          ) : null}
        </div>

        <div className="flex flex-col gap-5 border border-white/12 p-5 md:p-6 lg:col-span-5">
          <p className="text-sm leading-relaxed text-cream/55">
            <span className="text-cream/80">Concurrency</span> loads the lane.{" "}
            <span className="text-cream/80">Hedge</span> races a duplicate after a delay.{" "}
            <span className="text-cream/80">Timeout</span> cuts stuck work — too tight and you create false failures.
          </p>
          <label className="block">
            <span className="flex justify-between text-[0.78rem] text-cream/45">
              Concurrency
              <span className="tabular-nums text-cream">{controls.concurrency}</span>
            </span>
            <input
              className="slo-slider mt-3"
              type="range"
              min={8}
              max={48}
              step={2}
              value={controls.concurrency}
              onChange={(e) =>
                setControls((c) => ({
                  ...c,
                  concurrency: Number(e.target.value),
                }))
              }
            />
          </label>
          <label className="block">
            <span className="flex justify-between text-[0.78rem] text-cream/45">
              Timeout
              <span className="tabular-nums text-cream">{controls.timeoutMs}ms</span>
            </span>
            <input
              className="slo-slider mt-3"
              type="range"
              min={250}
              max={800}
              step={25}
              value={controls.timeoutMs}
              onChange={(e) =>
                setControls((c) => ({
                  ...c,
                  timeoutMs: Number(e.target.value),
                }))
              }
            />
          </label>
          <label className="flex items-center gap-3 text-sm text-cream/65">
            <input
              type="checkbox"
              className="size-4 accent-[var(--cinnabar)]"
              checked={controls.hedge}
              onChange={(e) =>
                setControls((c) => ({ ...c, hedge: e.target.checked }))
              }
            />
            Hedge slow requests
          </label>
          {controls.hedge ? (
            <label className="block">
              <span className="flex justify-between text-[0.78rem] text-cream/45">
                Hedge after
                <span className="tabular-nums text-cream">
                  {controls.hedgeAfterMs}ms
                </span>
              </span>
              <input
                className="slo-slider mt-3"
                type="range"
                min={60}
                max={220}
                step={10}
                value={controls.hedgeAfterMs}
                onChange={(e) =>
                  setControls((c) => ({
                    ...c,
                    hedgeAfterMs: Number(e.target.value),
                  }))
                }
              />
            </label>
          ) : null}
          <label className="flex items-center gap-3 text-sm text-cream/65">
            <input
              type="checkbox"
              className="size-4 accent-[var(--cinnabar)]"
              checked={stepMode}
              onChange={(e) => setStepOverride(e.target.checked)}
              disabled={phase === "running"}
            />
            Step mode
          </label>
          <div className="mt-auto flex flex-wrap gap-3 pt-2">
            {phase !== "running" ? (
              <button type="button" className="slo-btn-primary" onClick={start}>
                {phase === "intro" ? "Watch the tail" : "Play again"}
              </button>
            ) : stepMode ? (
              <button type="button" className="slo-btn-primary" onClick={applyTick}>
                Step →
              </button>
            ) : (
              <button
                type="button"
                className="slo-btn-secondary"
                onClick={() => {
                  stop();
                  setPhase("intro");
                }}
              >
                Abort
              </button>
            )}
          </div>
          <p className="text-sm leading-relaxed text-cream/45">
            Hint: modest concurrency + late hedges beat blasting duplicates on
            every request. p50 staying green does not mean the SLO is safe.
          </p>
        </div>
      </div>
    </div>
  );
}

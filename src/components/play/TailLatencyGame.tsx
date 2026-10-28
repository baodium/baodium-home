"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DrillControlLabel, DrillTip } from "@/components/play/DrillTip";
import { DrillNarrator } from "@/components/play/DrillNarrator";
import { DrillTeach, type DrillLesson } from "@/components/play/DrillTeach";
import { GameResultPanel } from "@/components/play/GameResultPanel";
import { PlayMeter } from "@/components/play/PlayMeter";
import { getPlayGame } from "@/data/play-games";
import { narrateTailLatency } from "@/lib/play/narrator";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";
import {
  createTail,
  emptyTailSnap,
  P99_BUDGET_MS,
  TAIL_DURATION_S,
  TAIL_TICK_MS,
  tickTail,
  type TailControls,
  type TailResult,
  type TailSnap,
} from "@/lib/play/tail-latency";

const catalog = getPlayGame("tail-latency");

const idleSnap: TailSnap = emptyTailSnap(
  "Quiet lane. Stragglers appear after 10s.",
);

export function TailLatencyGame() {
  const reduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState<"intro" | "running" | "won" | "lost">("intro");
  const [controls, setControls] = useState<TailControls>({
    concurrency: 24,
    hedge: false,
    hedgeAfterMs: 120,
    timeoutMs: 500,
  });
  const [snap, setSnap] = useState<TailSnap>(idleSnap);
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
    setSnap(emptyTailSnap("Collecting latency samples…"));
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
    const text = `Tail Latency on Baodium. score ${result.score}. ${result.takeaway} ${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Tail Latency · Baodium", text, url });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    }
  };

  const technologies =
    catalog?.technologies ??
    ["p50 / p99 latency", "Worker pools", "Request hedging", "Timeouts", "Work amplification"];
  const takeaway = catalog?.takeaway ?? catalog?.matters ?? "";
  const win =
    catalog?.success ??
    `Keep p99 ≤ ${P99_BUDGET_MS}ms for ${TAIL_DURATION_S}s without work cost running away.`;

  const lesson = useMemo((): DrillLesson => {
    if (phase === "intro") {
      return {
        simulate:
          "p50 is the median. p99 is the slowest 1%. After ~10s, stragglers appear. Hold p99 without drowning the fleet in hedge copies.",
        why: "Median health can hide a burning SLO. Hedging races the tail; too-early hedges inflate work cost and make everything slower.",
        technologies,
        simulation:
          "Keep concurrency modest, enable hedge with a late delay, then start. Watch p50, p95, p99, and the work-cost multiplier.",
        interpret: win,
      };
    }
    if (phase === "running") {
      if (snap.t < 10) {
        return {
          simulate: "Quiet lane. Load is steady. The real test starts when stragglers arrive.",
          why: "Early calm is not success. Hold the dials for the window that actually stresses the tail.",
          technologies,
          simulation: `${snap.message} Leave room for hedges: do not max concurrency before stragglers land.`,
          interpret: win,
        };
      }
      if (snap.p99 > P99_BUDGET_MS * 0.9) {
        return {
          simulate: `p99 is near or over ${P99_BUDGET_MS}ms. The tail is under fire.`,
          why: "Duplicate work buys latency only if the original request was truly stuck. Early hedges burn capacity.",
          technologies,
          simulation: `${snap.message} Cut concurrency, hedge later, or tighten timeout. Read p99 and cost together.`,
          interpret: win,
        };
      }
      return {
        simulate:
          "Stragglers are live. You are trading concurrency, hedge delay, and timeout against work cost.",
        why: "Users notice the tail, not the mean. A green p50 does not mean the SLO is safe.",
        technologies,
        simulation: controls.hedge
          ? `${snap.message} If cost climbs, delay the hedge further so only true stragglers get a duplicate.`
          : `${snap.message} Enable hedging with a late delay once p99 starts to stretch.`,
        interpret: win,
      };
    }
    if (phase === "won") {
      return {
        simulate: "Tail held. p99 stayed inside the budget.",
        why: result?.takeaway ?? takeaway,
        technologies,
        simulation:
          "Notice the work-cost multiplier. A win that doubles load is a fragile win.",
        interpret: "Win locked. Try earlier hedges next to see cost climb.",
      };
    }
    return {
      simulate: "The tail escaped. p99 blew the budget or work cost ran away.",
      why: result?.takeaway ?? takeaway,
      technologies,
      simulation: result?.reason ?? "p99 or cost broke first.",
      interpret: "Modest concurrency plus late hedges beat blasting duplicates on every request.",
    };
  }, [
    controls.hedge,
    phase,
    result,
    snap.message,
    snap.p99,
    snap.t,
    takeaway,
    technologies,
    win,
  ]);

  return (
    <div className="slo-game">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="drill-kicker">
            Play · Tail Latency
          </p>
          <h1 className="mt-3 max-w-xl font-serif text-3xl tracking-[-0.02em] md:text-4xl">
            Hold the tail under budget without drowning the fleet.
          </h1>
          <p className="mt-4 max-w-xl text-[0.98rem] leading-relaxed text-[color:var(--drill-muted)]">
            Stragglers hit after 10s.{" "}
            <DrillTip
              label="Hedge"
              tip="Send a duplicate request after a delay and take whichever finishes first. Helps the tail only when the extra work still fits in capacity."
            >
              <span className="underline decoration-dotted decoration-[color:var(--drill-faint)] underline-offset-2">
                Hedge
              </span>
            </DrillTip>{" "}
            carefully: duplicate work costs capacity. Hold p99 under {P99_BUDGET_MS}ms for{" "}
            {TAIL_DURATION_S}s.
          </p>
        </div>
        <p className="text-[0.78rem] tabular-nums text-[color:var(--drill-muted)]">
          Success <span className="text-[color:var(--drill-fg)]">p99 ≤ {P99_BUDGET_MS}ms</span>
        </p>
      </div>

      <DrillNarrator
        frame={narrateTailLatency({
          phase,
          p50: snap.p50,
          p99: snap.p99,
          budget: P99_BUDGET_MS,
          hedge: controls.hedge,
          hedgeAfterMs: controls.hedgeAfterMs,
          workers: controls.concurrency,
          queueDepth: snap.queueDepth,
          cost: snap.cost,
        })}
      />
      <DrillTeach lesson={lesson} />

      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <div className="drill-panel p-5 md:p-6 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.72rem] uppercase tracking-[0.18em] text-[color:var(--drill-muted)]">
              {phase === "intro"
                ? "Ready"
                : phase === "running"
                  ? `${snap.t.toFixed(1)}s`
                  : phase === "won"
                    ? "Tail held"
                    : "Tail blew"}
            </p>
            <p className="max-w-sm text-right text-sm text-[color:var(--drill-muted)]">{snap.message}</p>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <PlayMeter
              label="p50"
              tip="Median latency. half of requests are faster. Can stay green while the slowest 1% already miss the SLO."
              value={snap.p50}
              max={P99_BUDGET_MS}
              format={(n) => `${n.toFixed(0)} ms`}
              warnAt={0.35}
              dangerAt={0.55}
            />
            <PlayMeter
              label="p95"
              tip="95th-percentile latency. Sits between the median and the extreme tail."
              value={snap.p95}
              max={P99_BUDGET_MS}
              format={(n) => `${n.toFixed(0)} ms`}
              warnAt={0.7}
              dangerAt={0.9}
            />
            <PlayMeter
              label="p99"
              tip="99th-percentile latency. the slowest 1%. This is the budget you must hold."
              value={snap.p99}
              max={P99_BUDGET_MS}
              format={(n) => `${n.toFixed(0)} ms`}
              warnAt={0.85}
              dangerAt={1}
            />
            <PlayMeter
              label="Work cost"
              tip="How much extra work hedges create (1.0× = no duplicates). A win that doubles cost is fragile under the next load bump."
              value={snap.cost}
              max={2}
              format={(n) => `${n.toFixed(2)}×`}
              warnAt={0.7}
              dangerAt={0.9}
            />
            <PlayMeter
              label="Worker util"
              tip="Offered load vs worker pool. Above ~100% means queue wait dominates the tail."
              value={snap.util}
              max={1.2}
              format={(n) => `${Math.round(n * 100)}%`}
              warnAt={0.75}
              dangerAt={0.95}
            />
            <PlayMeter
              label="Queue depth"
              tip="Requests waiting for a free worker. Undersized concurrency lifts everyone's p99."
              value={snap.queueDepth}
              max={40}
              format={(n) => `${n.toFixed(0)}`}
              warnAt={0.4}
              dangerAt={0.7}
            />
          </div>
          {(phase === "won" || phase === "lost") && result ? (
            <GameResultPanel
              outcome={result.outcome}
              score={result.score}
              reason={result.reason}
              takeaway={result.takeaway}
              debrief={result.debrief}
              before={result.before}
              after={result.after}
              changed={result.changed}
              metrics={result.metrics}
              chapterHref={result.chapterHref}
              chapterLabel={result.chapterLabel}
              onAgain={start}
              onShare={share}
              copied={copied}
            />
          ) : null}
        </div>

        <div className="drill-panel flex flex-col gap-5 p-5 md:p-6 lg:col-span-5">
          <p className="text-sm leading-relaxed text-[color:var(--drill-muted)]">
            <span className="text-[color:var(--drill-fg)]">Workers</span> size the pool (queueing lifts the whole
            tail). <span className="text-[color:var(--drill-fg)]">Hedge</span> races a duplicate after a delay.{" "}
            <span className="text-[color:var(--drill-fg)]">Timeout</span> cuts stuck work. too tight and you create false failures.
          </p>
          <label className="block">
            <DrillControlLabel
              label="Concurrency"
              tip="How many requests run at once. Higher pressure stretches the tail; leave headroom if you plan to hedge."
              value={controls.concurrency}
            />
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
            <DrillControlLabel
              label="Timeout"
              tip="Cancel stuck work after this delay. Too tight creates false failures; too loose lets stragglers occupy capacity."
              value={`${controls.timeoutMs}ms`}
            />
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
          <label className="flex items-start gap-3 text-sm text-[color:var(--drill-muted)]">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--cinnabar)]"
              checked={controls.hedge}
              onChange={(e) =>
                setControls((c) => ({ ...c, hedge: e.target.checked }))
              }
            />
            <span>
              <DrillTip
                label="Hedge"
                tip="Race a duplicate after a delay and keep the faster response. Helps only when the original was truly stuck."
              >
                <span className="text-[color:var(--drill-fg)]">Hedge slow requests</span>
              </DrillTip>
            </span>
          </label>
          {controls.hedge ? (
            <label className="block">
              <DrillControlLabel
                label="Hedge after"
                tip="Delay before the duplicate is sent. Later hedges hit true stragglers; early hedges inflate work cost."
                value={`${controls.hedgeAfterMs}ms`}
              />
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
          <label className="flex items-center gap-3 text-sm text-[color:var(--drill-muted)]">
            <input
              type="checkbox"
              className="size-4 accent-[var(--cinnabar)]"
              checked={stepMode}
              onChange={(e) => setStepOverride(e.target.checked)}
              disabled={phase === "running"}
            />
            <DrillTip
              label="Step mode"
              tip="Advance one simulation tick at a time. Default when reduced motion is on."
            >
              <span>Step mode</span>
            </DrillTip>
          </label>
          <div className="mt-auto flex flex-wrap gap-3 pt-2">
            {phase !== "running" ? (
              <button type="button" className="slo-btn-primary" onClick={start}>
                {phase === "intro" ? "Start drill" : "Play again"}
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
                  setSnap(idleSnap);
                  setPhase("intro");
                }}
              >
                Abort
              </button>
            )}
          </div>
          <p className="text-sm leading-relaxed text-[color:var(--drill-muted)]">
            Modest concurrency + late hedges beat blasting duplicates on every
            request. A green p50 does not mean the SLO is safe.
          </p>
        </div>
      </div>
    </div>
  );
}

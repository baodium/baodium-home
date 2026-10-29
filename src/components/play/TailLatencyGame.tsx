"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LearningWorkbench } from "@/components/learning/LearningWorkbench";
import { DrillModeBar } from "@/components/play/DrillModeBar";
import { DrillSuccessCriteria } from "@/components/play/DrillSuccessCriteria";
import { DrillControlLabel, DrillTip } from "@/components/play/DrillTip";
import { DrillNarrator } from "@/components/play/DrillNarrator";
import {
  DrillPanelHeading,
  DrillProseHeader,
  DrillTakeaway,
  type DrillProse,
} from "@/components/play/DrillTeach";
import { DrillTransport } from "@/components/play/DrillTransport";
import { GameResultPanel } from "@/components/play/GameResultPanel";
import { PlayMeter } from "@/components/play/PlayMeter";
import { TailDistributionViz } from "@/components/play/viz/TailDistributionViz";
import { getPlayGame } from "@/data/play-games";
import { narrateTailLatency } from "@/lib/play/narrator";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";
import {
  DRILL_WINDOWS,
  TAIL_CRITERIA,
  type CriterionLive,
  type CriterionTone,
  type DrillMode,
} from "@/lib/play/success-criteria";
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
  "Quiet lane. Stragglers appear after about 10 seconds.",
);

function toneFor(met: boolean | null): CriterionTone {
  if (met === true) return "ok";
  if (met === false) return "bad";
  return "idle";
}

export function TailLatencyGame() {
  const reduced = usePrefersReducedMotion();
  const [mode, setMode] = useState<DrillMode>("practice");
  const [phase, setPhase] = useState<"intro" | "running" | "won" | "lost">(
    "intro",
  );
  const [paused, setPaused] = useState(false);
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
    setPaused(false);
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

  const onPause = useCallback(() => {
    stop();
    setPaused(true);
  }, [stop]);

  const onResume = useCallback(() => {
    if (stepMode) return;
    setPaused(false);
    if (loopRef.current !== null) return;
    loopRef.current = window.setInterval(
      applyTick,
      reduced ? TAIL_TICK_MS * 2 : TAIL_TICK_MS,
    );
  }, [applyTick, reduced, stepMode]);

  const onReset = useCallback(() => {
    stop();
    engineRef.current = createTail();
    setPaused(false);
    setPhase("intro");
    setSnap(idleSnap);
    setResult(null);
  }, [stop]);


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
    [
      "p50 / p99 latency",
      "Worker pools",
      "Request hedging",
      "Timeouts",
      "Work amplification",
    ];
  const takeaway =
    catalog?.takeaway ??
    "The slowest requests shape the customer experience. Hedging helps only when the duplicate work still fits.";

  const live = phase === "running" || phase === "won" || phase === "lost";

  const criteria = useMemo((): CriterionLive[] => {
    const p99 = snap.p99;
    const goodput = snap.goodput;
    const cost = snap.cost;
    const samples = snap.sampleCount;

    const p99Met = live ? p99 <= P99_BUDGET_MS : null;
    const goodputMet = live ? goodput >= 0.9 : null;
    const costMet = live ? cost < 1.8 : null;
    const samplesMet = live ? samples >= 40 : null;

    const byId: Record<
      string,
      { value: string; met: boolean | null }
    > = {
      p99: {
        value: live ? `${p99.toFixed(0)} ms` : "—",
        met: p99Met,
      },
      goodput: {
        value: live ? `${(goodput * 100).toFixed(0)}%` : "—",
        met: goodputMet,
      },
      cost: {
        value: live ? `${cost.toFixed(2)}×` : "—",
        met: costMet,
      },
      samples: {
        value: live ? `${samples}` : "—",
        met: samplesMet,
      },
    };

    // On done, gate each criterion from the same outcome rules the engine uses.
    if (result && (phase === "won" || phase === "lost")) {
      byId.p99 = {
        value: `${p99.toFixed(0)} ms`,
        met: p99 <= P99_BUDGET_MS,
      };
      byId.goodput = {
        value: `${(goodput * 100).toFixed(0)}%`,
        met: goodput >= 0.9,
      };
      byId.cost = {
        value: `${cost.toFixed(2)}×`,
        met: cost < 1.8,
      };
      byId.samples = {
        value: `${samples}`,
        met: samples >= 40,
      };
    }

    return TAIL_CRITERIA.map((def) => {
      const liveRow = byId[def.id] ?? { value: "—", met: null };
      return {
        ...def,
        value: liveRow.value,
        met: liveRow.met,
        tone: toneFor(liveRow.met),
      };
    });
  }, [live, phase, result, snap.cost, snap.goodput, snap.p99, snap.sampleCount]);

  const prose = useMemo((): DrillProse => {
    const challengeQ = "Can you keep p99 below 420 ms?";
    const objective = `Keep p99 at or below ${P99_BUDGET_MS} ms for the full ${TAIL_DURATION_S}-second run, without letting hedge copies push work cost past about 1.8×.`;

    if (mode === "challenge") {
      if (phase === "won") {
        return {
          title: "Tail Latency",
          challenge: challengeQ,
          situation: <p>You held the tail inside the budget for this run.</p>,
          objective,
          explore: technologies,
          gettingStarted:
            "Adjust the levers, start the run, and judge the pass/fail list from the evidence.",
          takeaway: result?.takeaway ?? takeaway,
        };
      }
      if (phase === "lost") {
        return {
          title: "Tail Latency",
          challenge: challengeQ,
          situation: (
            <p>
              {result?.reason ??
                "One or more pass/fail criteria missed. Read the list and change a lever."}
            </p>
          ),
          objective,
          explore: technologies,
          gettingStarted:
            "Read which criteria failed, change one lever, and run again.",
          takeaway: result?.takeaway ?? takeaway,
        };
      }
      return {
        title: "Tail Latency",
        challenge: challengeQ,
        situation: (
          <p>
            Hold the latency tail for {TAIL_DURATION_S} seconds. Exact pass/fail
            rules are listed beside the controls — use the evidence, not a
            recommended recipe.
          </p>
        ),
        objective,
        explore: technologies,
        gettingStarted:
          "Adjust the levers, start the run, and judge the pass/fail list from the evidence.",
        takeaway,
      };
    }

    if (phase === "won") {
      return {
        title: "Tail Latency",
        challenge: challengeQ,
        situation: <p>You held the tail inside the budget for this run.</p>,
        objective: `Keep p99 at or below ${P99_BUDGET_MS} ms for ${TAIL_DURATION_S} seconds without work cost running away.`,
        explore: technologies,
        gettingStarted:
          "Notice the work-cost multiplier beside p99. A win that doubles load is a fragile win under the next traffic bump.",
        takeaway: result?.takeaway ?? takeaway,
      };
    }
    if (phase === "lost") {
      return {
        title: "Tail Latency",
        challenge: challengeQ,
        situation: (
          <p>
            {result?.reason ??
              "p99 blew the budget, or hedge copies pushed work cost too high."}
          </p>
        ),
        objective: `Keep p99 at or below ${P99_BUDGET_MS} ms for ${TAIL_DURATION_S} seconds without work cost running away.`,
        explore: technologies,
        gettingStarted:
          "Try again with modest concurrency and a later hedge delay so only true stragglers get a duplicate.",
        takeaway: result?.takeaway ?? takeaway,
      };
    }
    return {
      title: "Tail Latency",
      challenge: challengeQ,
      situation: (
        <>
          <p>
            You are looking at request latency for a busy service. Most requests
            finish quickly, but a small share arrive late. Those late ones are
            the tail.
          </p>
          <p>
            After about 10 seconds in this drill, stragglers show up. The median
            can stay calm while the slowest requests stretch past your budget.
          </p>
        </>
      ),
      objective,
      terms: (
        <>
          <DrillTip
            label="p50"
            tip="Median latency: half of requests finish faster than this number."
          >
            <span className="text-[color:var(--drill-fg)]">p50</span>
          </DrillTip>{" "}
          is the median: half of requests are faster.{" "}
          <DrillTip
            label="p99"
            tip="99th-percentile latency: only 1% of requests are slower. This is usually what an SLO cares about."
          >
            <span className="text-[color:var(--drill-fg)]">p99</span>
          </DrillTip>{" "}
          is the slowest 1%. An SLO on the median can look fine while customers
          in the tail already time out.
        </>
      ),
      explore: technologies,
      gettingStarted:
        "Choose how many workers run at once, whether to hedge slow requests, and how long to wait before giving up. Then start the drill and watch p50 stay calm while p99 climbs when stragglers arrive.",
      takeaway,
    };
  }, [mode, phase, result, takeaway, technologies]);

  const statusLabel =
    phase === "intro"
      ? "Ready"
      : phase === "running"
        ? paused
          ? `Paused · ${snap.t.toFixed(1)}s`
          : `${snap.t.toFixed(1)}s`
        : phase === "won"
          ? "Tail held"
          : "Tail blew";

  const controlsPanel = (
    <div className="drill-panel flex flex-col gap-5 p-5 md:p-6">
      <DrillPanelHeading>Adjust your settings</DrillPanelHeading>

      <label className="block">
        <DrillControlLabel
          label="Concurrency"
          tip="How many requests run at once. Higher pressure stretches the tail; leave headroom if you plan to hedge."
          help="How many requests run at once. Higher pressure stretches the tail. Leave some headroom if you plan to send hedge copies."
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
          help="Cancel stuck work after this delay. Too tight creates false failures. Too loose lets stragglers occupy capacity."
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
          className="mt-1 size-4 accent-[var(--cinnabar)]"
          checked={controls.hedge}
          onChange={(e) =>
            setControls((c) => ({ ...c, hedge: e.target.checked }))
          }
        />
        <span>
          <span className="font-medium text-[color:var(--drill-fg)]">
            Hedge slow requests
          </span>
          <span className="mt-1.5 block leading-relaxed">
            Send a duplicate after a delay and keep whichever finishes first.
            This helps the tail only when the original request was truly stuck
            and the extra work still fits.
          </span>
        </span>
      </label>

      {controls.hedge ? (
        <label className="block">
          <DrillControlLabel
            label="Hedge after"
            tip="Delay before the duplicate is sent. Later hedges hit true stragglers; early hedges inflate work cost."
            help="How long to wait before sending the duplicate. Later hedges hit true stragglers. Early hedges inflate work cost for everyone."
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

      <label className="flex items-start gap-3 text-sm text-[color:var(--drill-muted)]">
        <input
          type="checkbox"
          className="mt-1 size-4 accent-[var(--cinnabar)]"
          checked={stepMode}
          onChange={(e) => setStepOverride(e.target.checked)}
          disabled={phase === "running"}
        />
        <span>
          <span className="font-medium text-[color:var(--drill-fg)]">
            Step mode
          </span>
          <span className="mt-1.5 block leading-relaxed">
            Advance one simulation tick at a time. This is the default when
            reduced motion is on.
          </span>
        </span>
      </label>

      <div className="mt-auto flex flex-wrap gap-3 pt-2">
                <DrillTransport
          phase={phase}
          stepMode={stepMode}
          paused={paused}
          onStart={start}
          onPause={onPause}
          onResume={onResume}
          onStep={applyTick}
          onReset={onReset}
        />
      </div>
    </div>
  );

  return (
    <div className="slo-game">
      <LearningWorkbench
        rail={
          <>
            <DrillModeBar
              mode={mode}
              onChange={setMode}
              disabled={phase === "running"}
            />
            <DrillProseHeader
              prose={prose}
              compact={phase === "running" || phase === "won" || phase === "lost"}
            />
            <DrillSuccessCriteria
              items={criteria}
              windowSec={DRILL_WINDOWS["tail-latency"]}
              running={phase === "running"}
            />
            {controlsPanel}
            <DrillTakeaway>{takeaway}</DrillTakeaway>
          </>
        }
        canvas={
          <>
            <TailDistributionViz
              samples={snap.samples}
              p50={snap.p50}
              p99={snap.p99}
              cost={snap.cost}
              hedge={controls.hedge}
              hedgeAfterMs={controls.hedgeAfterMs}
            />

            <div className="drill-panel p-5 md:p-6">
              <DrillPanelHeading
                status={
                  <span className="flex flex-col items-end gap-1 sm:flex-row sm:items-baseline sm:gap-3">
                    <span className="font-mono text-[0.68rem] uppercase tracking-[0.14em]">
                      {statusLabel}
                    </span>
                    <span className="max-w-xs text-right">{snap.message}</span>
                  </span>
                }
              >
                Live metrics
              </DrillPanelHeading>

              <div className="mb-5 [&_.drill-narrator]:mt-0">
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
              </div>

              <table className="drill-metrics-table">
                <thead>
                  <tr>
                    <th scope="col">Metric</th>
                    <th scope="col">Value</th>
                    <th scope="col">What it means</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>p50</td>
                    <td>{snap.p50.toFixed(0)} ms</td>
                    <td>Median latency. Half of requests are faster than this.</td>
                  </tr>
                  <tr>
                    <td>p95</td>
                    <td>{snap.p95.toFixed(0)} ms</td>
                    <td>Sits between the median and the extreme tail.</td>
                  </tr>
                  <tr>
                    <td>p99</td>
                    <td>{snap.p99.toFixed(0)} ms</td>
                    <td>
                      The slowest 1%. Hold this at or below {P99_BUDGET_MS} ms.
                    </td>
                  </tr>
                  <tr>
                    <td>Goodput</td>
                    <td>{(snap.goodput * 100).toFixed(0)}%</td>
                    <td>Completed requests versus completed plus timed out.</td>
                  </tr>
                  <tr>
                    <td>Work cost</td>
                    <td>{snap.cost.toFixed(2)}×</td>
                    <td>
                      Extra work from hedges. 1.0× means no duplicates. Above
                      ~1.8× is a fragile win.
                    </td>
                  </tr>
                  <tr>
                    <td>Worker util</td>
                    <td>{Math.round(snap.util * 100)}%</td>
                    <td>
                      Offered load versus the worker pool. Above ~100% means
                      queue wait dominates the tail.
                    </td>
                  </tr>
                  <tr>
                    <td>Queue depth</td>
                    <td>{snap.queueDepth.toFixed(0)}</td>
                    <td>
                      Requests waiting for a free worker. An undersized pool
                      lifts everyone&apos;s p99.
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <PlayMeter
                  label="p50"
                  tip="Median latency. Half of requests are faster. Can stay green while the slowest 1% already miss the SLO."
                  value={snap.p50}
                  max={P99_BUDGET_MS}
                  format={(n) => `${n.toFixed(0)} ms`}
                  warnAt={0.35}
                  dangerAt={0.55}
                />
                <PlayMeter
                  label="p99"
                  tip="99th-percentile latency: the slowest 1%. This is the budget you must hold."
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
          </>
        }
      />
    </div>
  );
}

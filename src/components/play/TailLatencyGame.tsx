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
  "The query stays at 70 ms. Acquire p95 is the line that moves.",
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
    lookupsPerSec: 560,
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
    ["Acquire p95", "Query time", "Little's Law", "The 40-connection pool"];
  const takeaway =
    catalog?.takeaway ??
    "The query stays near its baseline. Acquire p95 is the tail the pass bar measures.";

  const live = phase === "running" || phase === "won" || phase === "lost";

  const criteria = useMemo((): CriterionLive[] => {
    const p95 = snap.p95;
    const query = snap.p50;
    const samples = snap.sampleCount;
    const byId: Record<string, { value: string; met: boolean | null }> = {
      p95: { value: live ? `${p95.toFixed(0)} ms` : "pending", met: live ? p95 < P99_BUDGET_MS : null },
      query: { value: `${query.toFixed(0)} ms`, met: live ? query === 70 : null },
      samples: { value: live ? `${samples}` : "pending", met: live ? samples >= 40 : null },
    };

    return TAIL_CRITERIA.map((def) => {
      const liveRow = byId[def.id] ?? { value: "pending", met: null };
      return {
        ...def,
        value: liveRow.value,
        met: liveRow.met,
        tone: toneFor(liveRow.met),
      };
    });
  }, [live, snap.p50, snap.p95, snap.sampleCount]);

  const prose = useMemo((): DrillProse => {
    const challengeQ = "Can you keep acquire p95 under 50 ms while the query stays at 70?";
    const objective = `Keep acquire p95 under ${P99_BUDGET_MS} ms for the full ${TAIL_DURATION_S}-second run. The query stays at 70 ms.`;

    if (mode === "challenge") {
      if (phase === "won" || phase === "lost") {
        return {
          title: "Tail Latency",
          challenge: challengeQ,
          situation: <p>{result?.reason ?? snap.message}</p>,
          objective,
          explore: technologies,
          gettingStarted:
            phase === "won"
              ? "Run it again at a higher lookup rate and watch acquire p95 cross 50 ms while the query stays at 70."
              : "Read which line failed. The query does not move. The lookup rate does.",
          takeaway: result?.takeaway ?? takeaway,
        };
      }
      return {
        title: "Tail Latency",
        challenge: challengeQ,
        situation: (
          <p>
            The recommendation query holds a connection for about 70 ms. That number stays put. You choose how many lookups a second ask the 40-connection pool for a connection. The pass bar is acquire p95 under {P99_BUDGET_MS} ms.
          </p>
        ),
        objective,
        explore: technologies,
        gettingStarted:
          "Set the lookup rate, start the run, and read acquire p95 against the query.",
        takeaway,
      };
    }

    if (phase === "won" || phase === "lost") {
      return {
        title: "Tail Latency",
        challenge: challengeQ,
        situation: <p>{result?.reason ?? snap.message}</p>,
        objective,
        explore: technologies,
        gettingStarted:
          phase === "won"
            ? "The offered rate stayed on a passing stage. A higher rate is the row the table marks as failed."
            : "Lower the lookup rate and run again. The query stays at 70 ms either way.",
        takeaway: result?.takeaway ?? takeaway,
      };
    }
    return {
      title: "Tail Latency",
      challenge: challengeQ,
      situation: (
        <>
          <p>
            The recommendation query holds a connection for about 70 ms and does not slow down in this drill. What changes is how long a lookup waits to acquire a connection from the 40-connection pool.
          </p>
          <p>
            The chapter&apos;s load test records acquire p95 of about 8 ms at 400 lookups a second, and about 80 ms at 560. The pass bar is acquire p95 under {P99_BUDGET_MS} ms. The query stays at 70 ms, so a slower database call is not what fails the bar.
          </p>
        </>
      ),
      objective,
      terms: (
        <>
          The query is the time a connection is held for the recommendation lookup.{" "}
          <DrillTip
            label="Acquire p95"
            tip="The 95th percentile of the wait to get a connection. In this chapter that wait is the tail the pass bar measures."
          >
            <span className="text-[color:var(--drill-fg)]">Acquire p95</span>
          </DrillTip>{" "}
          is that wait at the 95th percentile. It moves with the lookup rate. The query does not.
        </>
      ),
      explore: technologies,
      gettingStarted:
        "Set lookups per second, then start the run. 400 a second is a passing stage. 480 and 560 are not. Watch the query stay at 70 ms while acquire p95 moves.",
      takeaway,
    };
  }, [mode, phase, result, snap.message, takeaway, technologies]);

  const statusLabel =
    phase === "intro"
      ? "Ready"
      : phase === "running"
        ? paused
          ? `Paused · ${snap.t.toFixed(1)}s`
          : `${snap.t.toFixed(1)}s`
        : phase === "won"
          ? "Inside the bar"
          : "Past the bar";

  const controlsPanel = (
    <div className="drill-panel flex flex-col gap-5 p-5 md:p-6">
      <DrillPanelHeading>Adjust your settings</DrillPanelHeading>

      <label className="block">
        <DrillControlLabel
          label="Lookups per second"
          tip="How many recommendation lookups ask the 40-connection pool for a connection."
          help="How many recommendation lookups ask the 40-connection pool for a connection. 400 a second passes. 560 a second does not."
          value={`${controls.lookupsPerSec}/s`}
        />
        <input
          className="slo-slider mt-3"
          type="range"
          min={300}
          max={560}
          step={20}
          value={controls.lookupsPerSec}
          onChange={(e) => setControls({ lookupsPerSec: Number(e.target.value) })}
        />
      </label>

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
              queryMs={snap.p50}
              p95={snap.p95}
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
                    queryMs: snap.p50,
                    p95: snap.p95,
                    budget: P99_BUDGET_MS,
                    lookups: controls.lookupsPerSec,
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
                    <td>Query</td>
                    <td>{snap.p50.toFixed(0)} ms</td>
                    <td>Time a connection is held. This stays at 70 ms.</td>
                  </tr>
                  <tr>
                    <td>Acquire p95</td>
                    <td>{snap.p95.toFixed(0)} ms</td>
                    <td>Wait for a connection. Hold this under {P99_BUDGET_MS} ms.</td>
                  </tr>
                  <tr>
                    <td>Lookups</td>
                    <td>{controls.lookupsPerSec.toFixed(0)}/s</td>
                    <td>Offered to the 40-connection pool. 400/s passes. 560/s does not.</td>
                  </tr>
                  <tr>
                    <td>Demand</td>
                    <td>{(controls.lookupsPerSec * 0.07).toFixed(0)}</td>
                    <td>Lookups per second times 70 ms, in connections. The pool holds 40.</td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <PlayMeter
                  label="Query"
                  tip="Time a connection is held for the recommendation lookup. It stays at 70 ms."
                  value={snap.p50}
                  max={120}
                  format={(n) => `${n.toFixed(0)} ms`}
                  warnAt={0.9}
                  dangerAt={1}
                />
                <PlayMeter
                  label="Acquire p95"
                  tip="95th percentile of the wait for a connection. The pass bar is 50 ms."
                  value={snap.p95}
                  max={100}
                  format={(n) => `${n.toFixed(0)} ms`}
                  warnAt={0.4}
                  dangerAt={0.5}
                />
                <PlayMeter
                  label="Lookups"
                  tip="Lookups per second offered to the pool. 400 passes. 560 does not."
                  value={controls.lookupsPerSec}
                  max={560}
                  format={(n) => `${n.toFixed(0)}/s`}
                  warnAt={0.72}
                  dangerAt={0.86}
                />
                <PlayMeter
                  label="Demand"
                  tip="Connections implied by lookups per second times a 70 ms hold. The pool has 40."
                  value={controls.lookupsPerSec * 0.07}
                  max={40}
                  format={(n) => n.toFixed(0)}
                  warnAt={0.75}
                  dangerAt={1}
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

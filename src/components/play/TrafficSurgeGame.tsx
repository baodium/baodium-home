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
import { AdmissionQueueViz } from "@/components/play/viz/AdmissionQueueViz";
import { getPlayGame } from "@/data/play-games";
import { narrateTrafficSurge } from "@/lib/play/narrator";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";
import {
  DRILL_WINDOWS,
  SURGE_CRITERIA,
  type CriterionLive,
  type CriterionTone,
  type DrillMode,
} from "@/lib/play/success-criteria";
import {
  CAPACITY,
  createSurge,
  emptySurgeSnap,
  P95_LIMIT_MS,
  SURGE_DURATION_S,
  SURGE_TICK_MS,
  tickSurge,
  type SurgeControls,
  type SurgeResult,
  type SurgeSnap,
} from "@/lib/play/traffic-surge";

const catalog = getPlayGame("traffic-surge");

const idleSnap: SurgeSnap = emptySurgeSnap(
  "300 a second passes. 400 a second passes. 480 a second does not.",
);

function toneFor(met: boolean | null): CriterionTone {
  if (met === true) return "ok";
  if (met === false) return "bad";
  return "idle";
}

export function TrafficSurgeGame() {
  const reduced = usePrefersReducedMotion();
  const [mode, setMode] = useState<DrillMode>("practice");
  const [phase, setPhase] = useState<"intro" | "running" | "won" | "lost">(
    "intro",
  );
  const [paused, setPaused] = useState(false);
  const [controls, setControls] = useState<SurgeControls>({
    admitPerSec: 560,
  });
  const [snap, setSnap] = useState<SurgeSnap>(idleSnap);
  const [result, setResult] = useState<SurgeResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [stepOverride, setStepOverride] = useState<boolean | null>(null);
  const stepMode = stepOverride ?? reduced;

  const engineRef = useRef(createSurge());
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
    const { state, snap: next, done } = tickSurge(
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
    engineRef.current = createSurge();
    setResult(null);
    setCopied(false);
    setSnap(
      emptySurgeSnap("The table starts at 300 lookups a second."),
    );
    setPaused(false);
    setPhase("running");
    if (stepMode) {
      applyTick();
      return;
    }
    loopRef.current = window.setInterval(
      applyTick,
      reduced ? SURGE_TICK_MS * 2 : SURGE_TICK_MS,
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
      reduced ? SURGE_TICK_MS * 2 : SURGE_TICK_MS,
    );
  }, [applyTick, reduced, stepMode]);

  const onReset = useCallback(() => {
    stop();
    engineRef.current = createSurge();
    setPaused(false);
    setPhase("intro");
    setSnap(idleSnap);
    setResult(null);
  }, [stop]);


  const share = async () => {
    if (!result) return;
    const url = `${typeof window !== "undefined" ? window.location.origin : "https://baodium.com"}/play/traffic-surge`;
    const text = `Traffic Surge on Baodium. score ${result.score}. ${result.takeaway} ${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Traffic Surge · Baodium", text, url });
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
    ["Little's Law", "Load tests", "Admission limits", "Acquire p95"];
  const takeaway =
    catalog?.takeaway ??
    "400 lookups a second is the last passing stage. That is where the admission limit sits.";

  const live = phase === "running" || phase === "won" || phase === "lost";
  const onLastPass = controls.admitPerSec >= 390 && controls.admitPerSec < 450;
  const rejectFrac = 1 - snap.successRate;

  const criteria = useMemo((): CriterionLive[] => {
    const byId: Record<string, { value: string; met: boolean | null }> = {
      p95: {
        value: live ? `${snap.p95.toFixed(0)} ms` : "pending",
        met: live ? snap.p95 < P95_LIMIT_MS : null,
      },
      rejected: {
        value: live ? `${(rejectFrac * 100).toFixed(1)}%` : "pending",
        met: live ? rejectFrac < 0.01 : null,
      },
      stage: {
        value: `${controls.admitPerSec.toFixed(0)}/s`,
        met: live ? onLastPass : null,
      },
    };

    return SURGE_CRITERIA.map((def) => {
      const row = byId[def.id] ?? { value: "pending", met: null };
      return {
        ...def,
        value: row.value,
        met: row.met,
        tone: toneFor(row.met),
      };
    });
  }, [controls.admitPerSec, live, onLastPass, rejectFrac, snap.p95]);

  const prose = useMemo((): DrillProse => {
    const challengeQ = "Can you keep acquire p95 under 50 ms on the last passing stage?";
    const objective = `Over ${SURGE_DURATION_S} seconds, acquire p95 stays under ${P95_LIMIT_MS} ms, rejections stay under 1 percent, and the admission limit sits on the ${CAPACITY} lookups per second stage.`;

    if (phase === "won" || phase === "lost") {
      return {
        title: "Traffic Surge",
        challenge: challengeQ,
        situation: <p>{result?.reason ?? snap.message}</p>,
        objective,
        explore: technologies,
        gettingStarted:
          phase === "won"
            ? "The test stayed on the passing rows. A higher limit includes a stage the table marks as failed."
            : "Read which bar failed. A stage can show acquire p95 under 50 ms and still fail on rejections.",
        takeaway: result?.takeaway ?? takeaway,
      };
    }

    if (mode === "challenge") {
      return {
        title: "Traffic Surge",
        challenge: challengeQ,
        situation: (
          <p>
            The load test raises lookups per second in stages and stops at the admission limit you set. A stage passes only when acquire p95 stays under {P95_LIMIT_MS} ms and rejections stay under 1 percent.
          </p>
        ),
        objective,
        explore: technologies,
        gettingStarted:
          "Set the admission limit, start the run, and read both bars on the highest stage the test reaches.",
        takeaway,
      };
    }

    return {
      title: "Traffic Surge",
      challenge: challengeQ,
      situation: (
        <>
          <p>
            The chapter&apos;s load test walks 300, 400, 480, and 560 lookups a second. A stage passes only when acquire p95 stays under {P95_LIMIT_MS} ms and rejections stay under 1 percent.
          </p>
          <p>
            300 and 400 pass. At 480, acquire p95 can still be 25 ms while about 2 percent of requests are rejected, so that stage fails. At 560, 120 requests are rejected and acquire p95 is about 80 ms.
          </p>
        </>
      ),
      objective,
      terms: (
        <>
          <DrillTip
            label="Acquire p95"
            tip="The 95th percentile of the wait for a connection from the 40-connection pool."
          >
            <span className="text-[color:var(--drill-fg)]">Acquire p95</span>
          </DrillTip>{" "}
          is the wait for a connection, at the 95th percentile. Rejections are requests that stage turned away. A stage can look fine on latency and still fail the rejection bar.
        </>
      ),
      explore: technologies,
      gettingStarted:
        "Set the admission limit, then start. The test spends about 9 seconds on each stage it is allowed to reach, beginning at 300.",
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
          ? "On the passing stage"
          : "Past the passing stage";

  const controlsPanel = (
    <div className="drill-panel flex flex-col gap-5 p-5 md:p-6">
      <DrillPanelHeading>Adjust your settings</DrillPanelHeading>

      <label className="block">
        <DrillControlLabel
          label="Admission limit"
          tip="Highest lookups per second the load test is allowed to reach."
          help="Highest lookups per second the load test is allowed to reach. The test walks 300, 400, 480, and 560, and it stops at this limit."
          value={`${controls.admitPerSec}/s`}
        />
        <input
          className="slo-slider mt-3"
          type="range"
          min={300}
          max={560}
          step={20}
          value={controls.admitPerSec}
          onChange={(e) =>
            setControls({ admitPerSec: Number(e.target.value) })
          }
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
            Advance one simulation tick at a time. Default when reduced motion
            is on.
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
              windowSec={DRILL_WINDOWS["traffic-surge"]}
              running={phase === "running"}
            />
            {controlsPanel}
            <DrillTakeaway>{takeaway}</DrillTakeaway>
          </>
        }
        canvas={
          <>
            <AdmissionQueueViz
              stage={snap.arrivals}
              limit={controls.admitPerSec}
              p95={snap.p95}
              p95Limit={P95_LIMIT_MS}
              reject={1 - snap.successRate}
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
                  frame={narrateTrafficSurge({
                    phase,
                    t: snap.t,
                    arrivals: snap.arrivals,
                    p95: snap.p95,
                    p95Limit: P95_LIMIT_MS,
                    reject: 1 - snap.successRate,
                    limit: controls.admitPerSec,
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
                    <td>Stage</td>
                    <td>{snap.arrivals.toFixed(0)}/s</td>
                    <td>The load-test row running now. The ladder is 300, 400, 480, 560.</td>
                  </tr>
                  <tr>
                    <td>Acquire p95</td>
                    <td>{snap.p95.toFixed(0)} ms</td>
                    <td>Hold this under {P95_LIMIT_MS} ms. At 480 it can still be 25 ms.</td>
                  </tr>
                  <tr>
                    <td>Rejections</td>
                    <td>{((1 - snap.successRate) * 100).toFixed(1)}%</td>
                    <td>Must stay under 1 percent. 480 fails this bar even when p95 looks fine.</td>
                  </tr>
                  <tr>
                    <td>Limit</td>
                    <td>{controls.admitPerSec.toFixed(0)}/s</td>
                    <td>The highest stage the test is allowed to reach. The last passing stage is {CAPACITY}/s.</td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <PlayMeter
                  label="Stage"
                  tip="Lookups per second on the current load-test row."
                  value={snap.arrivals}
                  max={560}
                  format={(n) => `${n.toFixed(0)}/s`}
                  warnAt={0.72}
                  dangerAt={0.86}
                />
                <PlayMeter
                  label="Acquire p95"
                  tip="95th percentile of the wait for a connection. The bar is 50 ms."
                  value={snap.p95}
                  max={100}
                  format={(n) => `${n.toFixed(0)} ms`}
                  warnAt={0.4}
                  dangerAt={0.5}
                />
                <PlayMeter
                  label="Rejections"
                  tip="Share of requests this stage turns away. The bar is 1 percent."
                  value={1 - snap.successRate}
                  max={0.25}
                  format={(n) => `${(n * 100).toFixed(1)}%`}
                  warnAt={0.04}
                  dangerAt={0.08}
                />
                <PlayMeter
                  label="Limit"
                  tip="Highest stage the test may reach. 400 per second is the last row that passes both bars."
                  value={controls.admitPerSec}
                  max={560}
                  format={(n) => `${n.toFixed(0)}/s`}
                  warnAt={0.72}
                  dangerAt={0.86}
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

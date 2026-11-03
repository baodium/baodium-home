"use client";

import { shareResult } from "@/lib/play/share-result";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RunningCode } from "@/components/experience/RunningCode";
import { LearningWorkbench } from "@/components/learning/LearningWorkbench";
import { fraudProgram } from "@/lib/experience/running-code";
import { DrillModeBar } from "@/components/play/DrillModeBar";
import { DrillSuccessCriteria } from "@/components/play/DrillSuccessCriteria";
import { DrillControlLabel } from "@/components/play/DrillTip";
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
import { CascadeTopologyViz } from "@/components/play/viz/CascadeTopologyViz";
import { getPlayGame } from "@/data/play-games";
import { narrateCascade } from "@/lib/play/narrator";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";
import {
  CASCADE_CRITERIA,
  DRILL_WINDOWS,
  type CriterionLive,
  type DrillMode,
} from "@/lib/play/success-criteria";
import {
  CASCADE_DURATION_S,
  CASCADE_TICK_MS,
  createCascade,
  emptyCascadeSnap,
  tickCascade,
  type CascadeControls,
  type CascadeResult,
  type CascadeSnap,
} from "@/lib/play/cascade";

const catalog = getPlayGame("cascade");

const idleSnap: CascadeSnap = emptyCascadeSnap();

function liveCascadeCriteria(
  snap: CascadeSnap,
  phase: "intro" | "running" | "won" | "lost",
): CriterionLive[] {
  const active = phase !== "intro";
  const orphan = snap.cascadeRisk > 0.5;
  const callerOk = snap.health.edge > 0.5;
  const child = Math.round(snap.util.auth * 1000);
  return CASCADE_CRITERIA.map((c) => {
    if (c.id === "orphan") {
      return {
        ...c,
        value: orphan ? "Still running" : "0 ms",
        tone: !active ? "idle" : orphan ? "bad" : "ok",
        met: active ? !orphan : null,
      };
    }
    if (c.id === "caller") {
      return {
        ...c,
        value: callerOk ? "Inside the time left" : "Past the time left",
        tone: !active ? "idle" : callerOk ? "ok" : "bad",
        met: active ? callerOk : null,
      };
    }
    return {
      ...c,
      value: `${child} ms`,
      tone: !active ? "idle" : "ok",
      met: active ? true : null,
    };
  });
}

export function CascadeGame() {
  const reduced = usePrefersReducedMotion();
  const [mode, setMode] = useState<DrillMode>("practice");
  const [phase, setPhase] = useState<"intro" | "running" | "won" | "lost">("intro");
  const [paused, setPaused] = useState(false);
  const [controls, setControls] = useState<CascadeControls>({
    providerMs: 900,
    remainingMs: 500,
    reserveMs: 80,
    permit: true,
    cancel: false,
  });
  const [snap, setSnap] = useState<CascadeSnap>(idleSnap);
  const [result, setResult] = useState<CascadeResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState(false);
  const [stepOverride, setStepOverride] = useState<boolean | null>(null);
  const stepMode = stepOverride ?? reduced;

  const engineRef = useRef(createCascade());
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
    const { state, snap: next, done } = tickCascade(
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
    engineRef.current = createCascade();
    setResult(null);
    setShareError(false);
    setCopied(false);
    setSnap(emptyCascadeSnap("The provider is slower than the time checkout has left."));
    setPaused(false);
    setPhase("running");
    if (stepMode) {
      applyTick();
      return;
    }
    loopRef.current = window.setInterval(
      applyTick,
      reduced ? CASCADE_TICK_MS * 2 : CASCADE_TICK_MS,
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
      reduced ? CASCADE_TICK_MS * 2 : CASCADE_TICK_MS,
    );
  }, [applyTick, reduced, stepMode]);

  const onReset = useCallback(() => {
    stop();
    engineRef.current = createCascade();
    setPaused(false);
    setPhase("intro");
    setSnap(idleSnap);
    setResult(null);
    setShareError(false);
  }, [stop]);


  const share = async () => {
    if (!result) return;
    const url = `${typeof window !== "undefined" ? window.location.origin : "https://baodium.com"}/play/cascade`;
    const text = `Cascade on Baodium. score ${result.score}. ${result.takeaway} ${url}`;
    setShareError(false);
    const outcome = await shareResult({ title: "Cascade · Baodium", text, url });
    setCopied(outcome === "copied");
    setShareError(outcome === "failed");
  };

  const technologies = useMemo(() => catalog?.technologies ??
    ["Deadlines", "Cancellation", "Outbound permits", "Fraud provider"], []);
  const takeaway =
    catalog?.takeaway ??
    "evaluate_risk receives the child deadline and request.cancellation. The provider stops when checkout is out of time.";

  const criteria = useMemo(() => liveCascadeCriteria(snap, phase), [phase, snap]);

  const prose = useMemo((): DrillProse => {
    const challengeQ = "Can you stop the fraud provider when checkout is out of time?";
    const objective = `Over ${CASCADE_DURATION_S} seconds, leftover provider work stays at 0 ms and checkout returns inside the time it had left.`;

    if (phase === "won" || phase === "lost") {
      return {
        title: "Cascade",
        challenge: challengeQ,
        situation: <p>{result?.reason ?? snap.message}</p>,
        objective,
        explore: technologies,
        gettingStarted:
          phase === "won"
            ? "Run it again without cancellation and watch the provider keep working after checkout returns."
            : "Read which line failed. Cancellation stops a call that already started. A missing permit never starts it.",
        takeaway: result?.takeaway ?? takeaway,
      };
    }

    const situation = (
      <>
        <p>
          Checkout calls the fraud provider through reserve_fraud_call. The child deadline is the time checkout has left, minus the reserve, and it is capped at 1000 ms. The provider in front of you is slower than that time.
        </p>
        <p>
          If cancellation is passed with the deadline, the provider stops when checkout returns. If it is not, the provider keeps running after the caller is done. A missing permit is a different branch: the call never starts.
        </p>
      </>
    );

    return {
      title: "Cascade",
      challenge: challengeQ,
      situation,
      objective,
      terms: (
        <>
          The child deadline is the minimum of 1000 ms and the time checkout has left, minus the reserve. Cancellation is request.cancellation, passed into evaluate_risk with that deadline. The outbound permit comes from outbound_fraud_slots.try_acquire. Without a permit the assessment is deferred.
        </>
      ),
      explore: technologies,
      gettingStarted:
        "Start from a provider that outlasts checkout. Pass cancellation and keep the permit. You can also refuse the permit and watch the deferred branch.",
      takeaway,
    };
  }, [phase, result, snap.message, takeaway, technologies]);

  const statusLabel =
    phase === "intro"
      ? "Ready"
      : phase === "running"
        ? paused
          ? `Paused · ${snap.t.toFixed(1)}s`
          : `${snap.t.toFixed(1)}s`
        : phase === "won"
          ? "Provider stopped"
          : "Provider still running";

  const running = phase === "running";
  const childMs = Math.min(1000, Math.max(0, controls.remainingMs - controls.reserveMs));
  const admitted = childMs >= 20 && controls.permit;
  const callerMs = admitted
    ? Math.min(controls.providerMs, childMs, controls.remainingMs)
    : 15;
  const orphanMs = admitted && !controls.cancel ? Math.max(0, controls.providerMs - callerMs) : 0;

  return (
    <div className="slo-game">
      <LearningWorkbench
        rail={
          <>
            <DrillModeBar
              mode={mode}
              onChange={setMode}
              disabled={running}
            />
            <DrillProseHeader prose={prose} compact={phase !== "intro"} />
            <DrillSuccessCriteria
              items={criteria}
              windowSec={DRILL_WINDOWS.cascade}
              running={running}
            />

            <div className="drill-panel flex flex-col gap-5 p-5 md:p-6">
              <DrillPanelHeading>Adjust your settings</DrillPanelHeading>

              <label className="block">
                <DrillControlLabel
                  label="Provider work"
                  tip="How long the fraud provider takes if it is allowed to finish."
                  help="How long the fraud provider takes if it is allowed to finish."
                  value={`${controls.providerMs} ms`}
                />
                <input
                  className="slo-slider mt-3"
                  type="range"
                  min={20}
                  max={1200}
                  step={20}
                  value={controls.providerMs}
                  onChange={(e) => setControls((c) => ({ ...c, providerMs: Number(e.target.value) }))}
                />
              </label>

              <label className="block">
                <DrillControlLabel
                  label="Time checkout has left"
                  tip="The budget the child deadline is cut from."
                  help="The budget the child deadline is cut from."
                  value={`${controls.remainingMs} ms`}
                />
                <input
                  className="slo-slider mt-3"
                  type="range"
                  min={100}
                  max={1500}
                  step={20}
                  value={controls.remainingMs}
                  onChange={(e) => setControls((c) => ({ ...c, remainingMs: Number(e.target.value) }))}
                />
              </label>

              <label className="block">
                <DrillControlLabel
                  label="Reserve after risk"
                  tip="Time kept back before the child deadline is computed."
                  help="checkout_policy.after_risk_budget_ms. This time is kept back before the child deadline is computed."
                  value={`${controls.reserveMs} ms`}
                />
                <input
                  className="slo-slider mt-3"
                  type="range"
                  min={0}
                  max={400}
                  step={10}
                  value={controls.reserveMs}
                  onChange={(e) => setControls((c) => ({ ...c, reserveMs: Number(e.target.value) }))}
                />
              </label>

              <label className="flex items-start gap-3 text-sm text-[color:var(--drill-muted)]">
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-[var(--cinnabar)]"
                  checked={controls.permit}
                  onChange={(e) => setControls((c) => ({ ...c, permit: e.target.checked }))}
                />
                <span>
                  <span className="font-medium text-[color:var(--drill-fg)]">Outbound permit</span>
                  <span className="mt-1.5 block leading-relaxed">
                    On, try_acquire returns a permit and the provider may be called. Off, the assessment is deferred.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 text-sm text-[color:var(--drill-muted)]">
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-[var(--cinnabar)]"
                  checked={controls.cancel}
                  onChange={(e) => setControls((c) => ({ ...c, cancel: e.target.checked }))}
                />
                <span>
                  <span className="font-medium text-[color:var(--drill-fg)]">Pass cancellation</span>
                  <span className="mt-1.5 block leading-relaxed">
                    On, evaluate_risk passes request.cancellation and the provider stops when the child deadline is spent.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 text-sm text-[color:var(--drill-muted)]">
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-[var(--cinnabar)]"
                  checked={stepMode}
                  onChange={(e) => setStepOverride(e.target.checked)}
                  disabled={running}
                />
                <span>
                  <span className="font-medium text-[color:var(--drill-fg)]">Step mode</span>
                  <span className="mt-1.5 block leading-relaxed">
                    Advance one simulation tick at a time. Default when reduced
                    motion is on.
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

              <DrillTakeaway>{takeaway}</DrillTakeaway>
            </div>
          </>
        }
        canvas={
          <>
            <RunningCode
              program={fraudProgram(
                {
                  providerMs: controls.providerMs,
                  remainingMs: controls.remainingMs,
                  reserveMs: controls.reserveMs,
                  permit: controls.permit,
                  cancel: controls.cancel,
                  callerMs,
                  orphanMs,
                  childMs,
                  admitted,
                },
                snap.t,
                reduced,
              )}
              onEdit={(id, value) => setControls((current) => ({ ...current, [id]: value }))}
            />
            <CascadeTopologyViz
              health={snap.health}
              circuitOpen={snap.circuitOpen}
              util={snap.util}
              cancel={controls.cancel}
              permit={controls.permit}
              cascadeRisk={snap.cascadeRisk}
            />

            <DrillNarrator
              frame={narrateCascade({
                phase,
                callerMs,
                orphanMs,
                childMs,
                cancel: controls.cancel,
                permit: controls.permit,
              })}
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
                    <td>Child deadline</td>
                    <td>{childMs.toFixed(0)} ms</td>
                    <td>min(1000, time left minus the reserve).</td>
                  </tr>
                  <tr>
                    <td>Caller</td>
                    <td>{callerMs.toFixed(0)} ms</td>
                    <td>How long checkout waits. It should finish inside the time it had left.</td>
                  </tr>
                  <tr>
                    <td>Still running</td>
                    <td>{orphanMs.toFixed(0)} ms</td>
                    <td>Provider work after checkout returns. Pass when this is 0.</td>
                  </tr>
                  <tr>
                    <td>Permit</td>
                    <td>{controls.permit ? "acquired" : "missing"}</td>
                    <td>A missing permit defers the call. That is not the same as stopping it.</td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <PlayMeter
                  label="Still running"
                  tip="Provider work that continues after checkout returns."
                  value={orphanMs}
                  max={Math.max(controls.providerMs, 100)}
                  format={(n) => `${n.toFixed(0)} ms`}
                  warnAt={0.05}
                  dangerAt={0.15}
                />
                <PlayMeter
                  label="Caller"
                  tip="How long checkout waits, against the time it had left."
                  value={callerMs}
                  max={Math.max(controls.remainingMs, 100)}
                  format={(n) => `${n.toFixed(0)} ms`}
                  warnAt={0.85}
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
                  shareError={shareError}
                />
              ) : null}
            </div>
          </>
        }
      />
    </div>
  );
}

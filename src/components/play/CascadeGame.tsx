"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LearningWorkbench } from "@/components/learning/LearningWorkbench";
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

const idleSnap: CascadeSnap = emptyCascadeSnap(
  "Checkout is healthy. The dependencies are answering.",
);

function liveCascadeCriteria(
  okRate: number | null,
  edge: number,
  peakRisk: number,
  phase: "intro" | "running" | "won" | "lost",
): CriterionLive[] {
  const active = phase !== "intro";
  return CASCADE_CRITERIA.map((c) => {
    if (c.id === "okRate") {
      const met = okRate == null ? null : okRate >= 0.6;
      return {
        ...c,
        value: okRate == null ? "—" : `${(okRate * 100).toFixed(0)}%`,
        tone: !active || met == null ? "idle" : met ? "ok" : "bad",
        met: active ? met : null,
      };
    }
    if (c.id === "edge") {
      const met = edge > 0.42;
      return {
        ...c,
        value: `${(edge * 100).toFixed(0)}%`,
        tone: !active ? "idle" : met ? "ok" : "bad",
        met: active ? met : null,
      };
    }
    const met = peakRisk < 0.82;
    return {
      ...c,
      value: `${(peakRisk * 100).toFixed(0)}%`,
      tone: !active ? "idle" : met ? "ok" : "bad",
      met: active ? met : null,
    };
  });
}

export function CascadeGame() {
  const reduced = usePrefersReducedMotion();
  const [mode, setMode] = useState<DrillMode>("practice");
  const [phase, setPhase] = useState<"intro" | "running" | "won" | "lost">("intro");
  const [paused, setPaused] = useState(false);
  const [controls, setControls] = useState<CascadeControls>({
    tripAt: 0.35,
    bulkheadAuth: false,
    bulkheadPay: false,
    timeoutMs: 150,
  });
  const [snap, setSnap] = useState<CascadeSnap>(idleSnap);
  const [result, setResult] = useState<CascadeResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [stepOverride, setStepOverride] = useState<boolean | null>(null);
  const [peakRisk, setPeakRisk] = useState(0);
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
    setPeakRisk((prev) => Math.max(prev, next.cascadeRisk));
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
    setCopied(false);
    setPeakRisk(0);
    setSnap(emptyCascadeSnap("Faults inject at about 8 seconds."));
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
    setPeakRisk(0);
    setSnap(idleSnap);
    setResult(null);
  }, [stop]);


  const share = async () => {
    if (!result) return;
    const url = `${typeof window !== "undefined" ? window.location.origin : "https://baodium.com"}/play/cascade`;
    const text = `Cascade on Baodium. score ${result.score}. ${result.takeaway} ${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Cascade · Baodium", text, url });
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
    ["Circuit breakers", "Bulkheads", "Fail-fast timeouts", "Shared worker pools", "Dependency health"];
  const practiceTakeaway =
    "Failing a call quickly returns the worker. It does not, by itself, stop that dependency from using the same pool as the rest of checkout.";
  const challengeTakeaway =
    "The service that slows down is not always the only one whose health falls. Watch whether the edge moves with it.";
  const takeaway = mode === "challenge" ? challengeTakeaway : practiceTakeaway;

  const okRate =
    snap.checkoutOk + snap.checkoutFail <= 0
      ? null
      : snap.checkoutOk / (snap.checkoutOk + snap.checkoutFail);

  const livePeak = Math.max(peakRisk, snap.cascadeRisk);
  const criteria = useMemo(
    () => liveCascadeCriteria(okRate, snap.health.edge, livePeak, phase),
    [okRate, snap.health.edge, livePeak, phase],
  );

  const prose = useMemo((): DrillProse => {
    const challengeQ = "Can you keep checkout alive when a dependency fails?";
    const objective =
      mode === "challenge"
        ? `Over ${CASCADE_DURATION_S} seconds, keep checkout success at or above 60 percent, edge health above 42 percent, and peak cascade risk under 82 percent. There is no control that skips Auth.`
        : `Over ${CASCADE_DURATION_S} seconds, keep checkout success at or above 60 percent, edge health above 42 percent, and peak cascade risk under 82 percent. You can change breakers, worker budgets, and timeouts. You cannot skip the Auth call.`;

    if (phase === "won" || phase === "lost") {
      return {
        title: "Cascade",
        challenge: challengeQ,
        situation: <p>{result?.reason ?? snap.message}</p>,
        objective,
        explore: technologies,
        gettingStarted:
          mode === "challenge"
            ? "Compare checkout success, edge health, and peak cascade risk with the pass lines. Change a control only after you can say which mark lost health first."
            : phase === "won"
              ? "Run it again with a looser trip threshold and watch whether the shared workers still pull edge health down."
              : "Read which pass line failed. Then change how soon a breaker opens, how long a call may wait, or which dependency has its own workers.",
        takeaway: result?.takeaway ?? takeaway,
      };
    }

    const situation =
      mode === "challenge" ? (
        <>
          <p>
            14:12 UTC, storefront checkout. Success was near 99 percent at the
            start of the shift. Customers now say the pay button spins, then
            fails. The edge is still up. One of the calls checkout makes is
            holding workers the rest of the path also needs. There is no route
            around Auth.
          </p>
          <p>
            You can change when a breaker opens, how long a call may hold a
            worker, and whether a dependency has its own workers. The diagram
            does not say which dependency will slow down, or which way to move
            a control. Judge the run by checkout success, edge health, and the
            highest cascade risk you see.
          </p>
        </>
      ) : (
        <>
          <p>
            14:12 UTC, storefront checkout. Success starts near 99 percent. The
            edge calls Auth, then Pay, and Pay is the service that queries the
            database. Those calls share one worker pool. There is no route
            around Auth.
          </p>
          <p>
            About eight seconds in, Auth slows and holds a worker longer on
            each call. A little later the database slows too. Workers stuck
            there are workers the edge and Pay cannot use, so checkout fails
            for the customer even while Pay itself is still healthy.
          </p>
          <p>
            On the diagram, a request moves along each call that is still being
            made. The bar under a name is that service&apos;s health. When a
            breaker opens, the call is labeled open and the request stops.
            Cascade risk is how far the wait has reached the edge.
          </p>
        </>
      );

    return {
      title: "Cascade",
      challenge: challengeQ,
      situation,
      objective,
      terms:
        mode === "practice" ? (
          <>
            A <span className="text-[color:var(--drill-fg)]">circuit breaker</span>{" "}
            stops new calls to a dependency that is already failing, so checkout
            spends the failure quickly instead of sitting on it. A{" "}
            <span className="text-[color:var(--drill-fg)]">bulkhead</span> is a
            separate worker budget for one dependency, so its waiters cannot take
            the slots the other calls still need. A shorter timeout limits how
            long one call may hold a worker. None of these removes the Auth call.
          </>
        ) : undefined,
      explore: technologies,
      gettingStarted:
        mode === "challenge"
          ? "Set the controls, then start. Read the health bar under each service as it moves. Open means that call stopped waiting. Compare checkout success, edge health, and cascade risk with the pass lines."
          : "You can change the error rate that opens a breaker, how long a call may wait, and whether Auth or Pay has its own workers. Start the run either way. Watch Auth's health fall first, then the database, and see whether edge health and cascade risk move with them.",
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
          ? "Contained"
          : "Spread";

  const running = phase === "running";

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
                  label="Trip circuit at"
                  tip="Error-rate threshold that opens the circuit."
                  help="Error-rate threshold that opens the circuit. Lower means you stop calling the sick dependency sooner."
                  value={`${Math.round(controls.tripAt * 100)}% errors`}
                />
                <input
                  className="slo-slider mt-3"
                  type="range"
                  min={0.15}
                  max={0.7}
                  step={0.05}
                  value={controls.tripAt}
                  onChange={(e) =>
                    setControls((c) => ({ ...c, tripAt: Number(e.target.value) }))
                  }
                />
              </label>

              <label className="block">
                <DrillControlLabel
                  label="Timeout"
                  tip="How long a caller waits on a dependency before failing."
                  help="How long a caller waits on a dependency before failing. Shorter timeouts free capacity faster when the dependency is stuck."
                  value={`${controls.timeoutMs}ms`}
                />
                <input
                  className="slo-slider mt-3"
                  type="range"
                  min={60}
                  max={280}
                  step={10}
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
                  checked={controls.bulkheadAuth}
                  onChange={(e) =>
                    setControls((c) => ({ ...c, bulkheadAuth: e.target.checked }))
                  }
                />
                <span>
                  <span className="font-medium text-[color:var(--drill-fg)]">
                    Bulkhead Auth
                  </span>
                  <span className="mt-1.5 block leading-relaxed">
                    Give Auth its own connection or thread pool so Auth waiters
                    cannot starve Pay, DB, or Edge work.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 text-sm text-[color:var(--drill-muted)]">
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-[var(--cinnabar)]"
                  checked={controls.bulkheadPay}
                  onChange={(e) =>
                    setControls((c) => ({ ...c, bulkheadPay: e.target.checked }))
                  }
                />
                <span>
                  <span className="font-medium text-[color:var(--drill-fg)]">
                    Bulkhead Pay
                  </span>
                  <span className="mt-1.5 block leading-relaxed">
                    Isolate Pay the same way. Useful when payment latency would
                    otherwise consume the shared pool.
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
            <CascadeTopologyViz
              health={snap.health}
              circuitOpen={snap.circuitOpen}
              util={snap.util}
              bulkheadAuth={controls.bulkheadAuth}
              bulkheadPay={controls.bulkheadPay}
              cascadeRisk={snap.cascadeRisk}
            />

            <DrillNarrator
              frame={narrateCascade({
                phase,
                edgeHealth: snap.health.edge,
                authHealth: snap.health.auth,
                dbHealth: snap.health.db,
                payHealth: snap.health.pay,
                circuitsOpen:
                  Number(snap.circuitOpen.auth) +
                  Number(snap.circuitOpen.pay) +
                  Number(snap.circuitOpen.db),
                bulkheadAuth: controls.bulkheadAuth,
                bulkheadPay: controls.bulkheadPay,
                cascadeRisk: snap.cascadeRisk,
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
                    <td>Cascade risk</td>
                    <td>{Math.round(snap.cascadeRisk * 100)}%</td>
                    <td>Chance the failure fans out through shared capacity.</td>
                  </tr>
                  <tr>
                    <td>Peak cascade risk</td>
                    <td>{Math.round(livePeak * 100)}%</td>
                    <td>Highest cascade risk seen this run (pass under 82%).</td>
                  </tr>
                  <tr>
                    <td>Checkout ok</td>
                    <td>
                      {okRate == null ? "—" : `${(okRate * 100).toFixed(0)}%`}
                    </td>
                    <td>Successful checkouts over attempts while a dependency is slow.</td>
                  </tr>
                  <tr>
                    <td>Edge health</td>
                    <td>{Math.round(snap.health.edge * 100)}%</td>
                    <td>Caller-side health at the edge. Must finish above 42%.</td>
                  </tr>
                  <tr>
                    <td>Auth util</td>
                    <td>{Math.round(snap.util.auth * 100)}%</td>
                    <td>
                      Auth concurrency fill. Without isolation this shares the pool.
                    </td>
                  </tr>
                  <tr>
                    <td>Pay util</td>
                    <td>{Math.round(snap.util.pay * 100)}%</td>
                    <td>
                      Pay concurrency fill. Isolation stops Auth sickness from
                      consuming these slots.
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <PlayMeter
                  label="Cascade risk"
                  tip="Estimated chance the failure fans out through shared capacity."
                  value={snap.cascadeRisk}
                  format={(n) => `${Math.round(n * 100)}%`}
                  warnAt={0.45}
                  dangerAt={0.7}
                />
                <PlayMeter
                  label="Checkout ok rate"
                  tip="Successful checkouts over attempts."
                  value={okRate == null ? 0 : 1 - okRate}
                  max={0.5}
                  format={() =>
                    okRate == null ? "—" : `${(okRate * 100).toFixed(0)}%`
                  }
                  warnAt={0.35}
                  dangerAt={0.6}
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

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DrillControlLabel } from "@/components/play/DrillTip";
import { DrillNarrator } from "@/components/play/DrillNarrator";
import {
  DrillPanelHeading,
  DrillProseHeader,
  DrillTakeaway,
  type DrillProse,
} from "@/components/play/DrillTeach";
import { GameResultPanel } from "@/components/play/GameResultPanel";
import { PlayMeter } from "@/components/play/PlayMeter";
import { getPlayGame } from "@/data/play-games";
import { narrateCascade } from "@/lib/play/narrator";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";
import {
  CASCADE_DURATION_S,
  CASCADE_TICK_MS,
  createCascade,
  emptyCascadeSnap,
  tickCascade,
  type CascadeControls,
  type CascadeResult,
  type CascadeSnap,
  type NodeId,
} from "@/lib/play/cascade";

const catalog = getPlayGame("cascade");

const idleSnap: CascadeSnap = emptyCascadeSnap(
  "All green. Auth starts wobbling around 8 seconds.",
);

const NODES: { id: NodeId; label: string }[] = [
  { id: "edge", label: "Edge" },
  { id: "auth", label: "Auth" },
  { id: "pay", label: "Pay" },
  { id: "db", label: "DB" },
];

export function CascadeGame() {
  const reduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState<"intro" | "running" | "won" | "lost">("intro");
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
    setCopied(false);
    setSnap(emptyCascadeSnap("Faults inject at about 8 seconds."));
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
  const takeaway =
    catalog?.takeaway ??
    "Isolate failure domains first. A circuit without a bulkhead still shares the blast radius.";

  const checkoutRate =
    snap.checkoutOk + snap.checkoutFail <= 0
      ? null
      : snap.checkoutOk / (snap.checkoutOk + snap.checkoutFail);

  const prose = useMemo((): DrillProse => {
    if (phase === "won" || phase === "lost") {
      return {
        title: "Cascade",
        challenge: "Can you keep checkout alive when a dependency fails?",
        situation: <p>{result?.reason ?? snap.message}</p>,
        objective: `Keep checkout answering through the wobble for ${CASCADE_DURATION_S} seconds without a site-wide outage.`,
        explore: technologies,
        gettingStarted:
          phase === "won"
            ? "Try without the Auth bulkhead next to see how shared pools spread failure."
            : "Try again with earlier circuit trips and isolated pools for Auth.",
        takeaway: result?.takeaway ?? takeaway,
      };
    }
    return {
      title: "Cascade",
      challenge: "Can you keep checkout alive when a dependency fails?",
      situation: (
        <>
          <p>
            Checkout depends on Auth, Pay, and the database. Around 8 seconds,
            one of those paths starts to fail and hold shared workers.
          </p>
          <p>
            You choose when to stop calling a sick dependency, how long callers
            wait, and whether each dependency gets its own capacity budget.
          </p>
        </>
      ),
      objective: `Keep checkout answering through the wobble for ${CASCADE_DURATION_S} seconds without a site-wide outage.`,
      terms: (
        <>
          A <span className="text-[color:var(--drill-fg)]">circuit breaker</span>{" "}
          stops calling a failing dependency after enough errors, so callers fail
          fast instead of waiting. A{" "}
          <span className="text-[color:var(--drill-fg)]">bulkhead</span> gives
          that dependency its own pool so its waiters cannot starve everyone else.
        </>
      ),
      explore: technologies,
      gettingStarted:
        "Set the trip threshold and timeouts, decide which bulkheads to enable, then start. Watch dependency health and cascade risk as Auth wobbles.",
      takeaway,
    };
  }, [phase, result, snap.message, takeaway, technologies]);

  const statusLabel =
    phase === "intro"
      ? "Ready"
      : phase === "running"
        ? `${snap.t.toFixed(1)}s`
        : phase === "won"
          ? "Contained"
          : "Spread";

  return (
    <div className="slo-game">
      <DrillProseHeader prose={prose} compact={phase !== "intro"} />

      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <div className="drill-panel p-5 md:p-6 lg:col-span-7">
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
          </div>

          <div
            className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4"
            aria-label="Dependency health"
          >
            {NODES.map((node) => {
              const h = snap.health[node.id];
              const open =
                node.id !== "edge" &&
                snap.circuitOpen[node.id as "auth" | "pay" | "db"];
              return (
                <div
                  key={node.id}
                  className={`border p-3 transition-colors duration-300 ${
                    h < 0.45
                      ? "border-cinnabar/80 bg-cinnabar/15"
                      : h < 0.75
                        ? "border-[color:var(--drill-signal)]/50 bg-[color:var(--drill-warn)]/10"
                        : "border-[color:var(--drill-line)] bg-[color:var(--drill-panel-soft)]/40"
                  }`}
                >
                  <p className="text-[0.68rem] uppercase tracking-[0.14em] text-[color:var(--drill-muted)]">
                    {node.label}
                    {open ? " · open" : ""}
                  </p>
                  <p className="mt-2 font-serif text-2xl tabular-nums text-[color:var(--drill-fg)]">
                    {Math.round(h * 100)}
                    <span className="text-base text-[color:var(--drill-muted)]">%</span>
                  </p>
                </div>
              );
            })}
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
                <td>Cascade risk</td>
                <td>{Math.round(snap.cascadeRisk * 100)}%</td>
                <td>
                  Chance the failure fans out through shared capacity.
                </td>
              </tr>
              <tr>
                <td>Checkout ok</td>
                <td>{checkoutRate == null ? "-" : `${(checkoutRate * 100).toFixed(0)}%`}</td>
                <td>Successful checkouts over attempts during the wobble.</td>
              </tr>
              <tr>
                <td>Auth util</td>
                <td>{Math.round(snap.util.auth * 100)}%</td>
                <td>Auth concurrency fill. Without a bulkhead this shares the pool.</td>
              </tr>
              <tr>
                <td>Pay util</td>
                <td>{Math.round(snap.util.pay * 100)}%</td>
                <td>Pay concurrency fill. Isolation stops Auth sickness from consuming these slots.</td>
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
              value={checkoutRate == null ? 0 : 1 - checkoutRate}
              max={0.5}
              format={() =>
                checkoutRate == null ? "-" : `${(checkoutRate * 100).toFixed(0)}%`
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

        <div className="drill-panel flex flex-col gap-5 p-5 md:p-6 lg:col-span-5">
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
              disabled={phase === "running"}
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

          <DrillTakeaway>{takeaway}</DrillTakeaway>
        </div>
      </div>
    </div>
  );
}

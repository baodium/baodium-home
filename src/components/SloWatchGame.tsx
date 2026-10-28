"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DrillControlLabel, DrillTip } from "@/components/play/DrillTip";
import { DrillNarrator } from "@/components/play/DrillNarrator";
import {
  DrillPanelHeading,
  DrillProseHeader,
  DrillTakeaway,
  type DrillProse,
} from "@/components/play/DrillTeach";
import { GameResultPanel } from "@/components/play/GameResultPanel";
import {
  createEngine,
  emptySloSnap,
  tick,
  TICK_MS,
  DURATION_S,
  SLO_TARGET,
  type Controls,
  type GamePhase,
  type GameResult,
  type RetryPolicy,
  type TickSnapshot,
} from "@/lib/slo-watch";
import { narrateSloWatch } from "@/lib/play/narrator";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";
import { getPlayGame } from "@/data/play-games";

const catalog = getPlayGame("slo-watch");

const initialSnap: TickSnapshot = emptySloSnap(
  "Warm traffic. Defaults will not survive Wave 3. Size up.",
);

function Meter({
  label,
  tip,
  value,
  max = 1,
  format,
  warnAt = 0.8,
  dangerAt = 0.95,
}: {
  label: string;
  tip?: string;
  value: number;
  max?: number;
  format: (n: number) => string;
  warnAt?: number;
  dangerAt?: number;
}) {
  const ratio = max === 0 ? 0 : Math.min(1.15, value / max);
  const tone =
    ratio >= dangerAt
      ? "bg-cinnabar"
      : ratio >= warnAt
        ? "bg-[color:var(--drill-warn)]"
        : "bg-[color:var(--drill-signal)]";
  return (
    <div>
      <div className="flex justify-between gap-3 text-[0.72rem] tracking-wide text-[color:var(--drill-muted)]">
        {tip ? (
          <DrillTip label={label} tip={tip}>
            <span>{label}</span>
          </DrillTip>
        ) : (
          <span>{label}</span>
        )}
        <span className="tabular-nums text-[color:var(--drill-fg)]">{format(value)}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden bg-[color:var(--drill-track)]">
        <div
          className={`h-full ${tone}`}
          style={{ width: `${Math.min(100, ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}

export function SloWatchGame({
  compact = false,
  embedded = false,
}: {
  compact?: boolean;
  embedded?: boolean;
}) {
  void compact;
  const reduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [controls, setControls] = useState<Controls>({
    poolSize: 100,
    concurrencyLimit: 90,
    retries: "cautious",
    shedding: false,
  });
  const [snap, setSnap] = useState<TickSnapshot>(initialSnap);
  const [result, setResult] = useState<GameResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [stepOverride, setStepOverride] = useState<boolean | null>(null);
  const stepMode = stepOverride ?? reduced;

  const engineRef = useRef(createEngine());
  const controlsRef = useRef(controls);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      window.clearInterval(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const applyTick = useCallback(() => {
    const { state, snap: next, done } = tick(engineRef.current, controlsRef.current);
    engineRef.current = state;
    setSnap(next);
    if (done) {
      stopLoop();
      setResult(done);
      setPhase(done.outcome);
    }
  }, [stopLoop]);

  const start = useCallback(() => {
    stopLoop();
    engineRef.current = createEngine();
    setResult(null);
    setCopied(false);
    setSnap(initialSnap);
    setPhase("running");

    if (stepMode) {
      applyTick();
      return;
    }

    const interval = window.setInterval(() => {
      applyTick();
    }, reduced ? TICK_MS * 2 : TICK_MS);
    rafRef.current = interval;
  }, [applyTick, reduced, stepMode, stopLoop]);

  useEffect(() => () => stopLoop(), [stopLoop]);

  const share = async () => {
    if (!result) return;
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/play/slo-watch`
        : "https://baodium.com/play/slo-watch";
    const text = result.shareText.replaceAll(
      "https://baodium.com/play/slo-watch",
      url,
    );
    try {
      if (navigator.share) {
        await navigator.share({ title: "SLO Watch · Baodium", text, url });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    }
  };

  const setRetry = (retries: RetryPolicy) =>
    setControls((c) => ({ ...c, retries }));

  const technologies =
    catalog?.technologies ??
    ["Error budgets", "Connection pools", "Concurrency limits", "Retry policy", "Load shedding"];
  const takeaway =
    catalog?.takeaway ??
    "Capacity and retries are coupled: aggressive retries under saturation spend the budget twice.";

  const prose = useMemo((): DrillProse => {
    if (phase === "won" || phase === "lost") {
      return {
        title: "SLO Watch",
        challenge: `Can you hold checkout at ${(SLO_TARGET * 100).toFixed(1)}% through three waves?`,
        situation: <p>{result?.reason ?? snap.message}</p>,
        objective: `Hold success at or above ${(SLO_TARGET * 100).toFixed(1)}% for ${DURATION_S} seconds without a cascade.`,
        explore: technologies,
        gettingStarted:
          phase === "won"
            ? "Try aggressive retries once to see the budget burn faster."
            : "Size the pool, keep retries cautious, and shed before Wave 3 saturates.",
        takeaway: result?.takeaway || takeaway,
      };
    }
    return {
      title: "SLO Watch",
      challenge: `Can you hold checkout at ${(SLO_TARGET * 100).toFixed(1)}% through three waves?`,
      situation: (
        <>
          <p>
            Checkout faces three traffic waves while you choose pool size,
            concurrency, retries, and whether to shed load.
          </p>
          <p>
            An{" "}
            <DrillTip
              label="error budget"
              tip="The amount of unreliability an SLO still allows. When it hits zero, you have broken the promise for the window."
            >
              <span className="text-[color:var(--drill-fg)]">error budget</span>
            </DrillTip>{" "}
            is the unreliability an SLO still allows. Empty it, or cascade under
            Wave 3, and the shift is lost.
          </p>
        </>
      ),
      objective: `Hold success at or above ${(SLO_TARGET * 100).toFixed(1)}% for the full ${DURATION_S}-second shift without a cascade.`,
      terms: (
        <>
          Pool size caps how many connections checkout can hold at once.
          Concurrency caps how much work you admit. They are different levers:
          sizing the pool without capping admission still queues.
        </>
      ),
      explore: technologies,
      gettingStarted:
        "Set the dials, then start the shift. Watch pool util, arrivals, success rate, and remaining error budget as each wave lands.",
      takeaway,
    };
  }, [phase, result, snap.message, takeaway, technologies]);

  const narrator = useMemo(
    () =>
      narrateSloWatch({
        phase,
        wave: snap.wave,
        poolUtil: snap.poolUtil,
        pending: snap.pending,
        arrivals: snap.arrivals,
        successRate: snap.successRate,
        errorBudget: snap.errorBudget,
        retries: controls.retries,
        shedding: controls.shedding,
        sloTarget: SLO_TARGET,
      }),
    [
      controls.retries,
      controls.shedding,
      phase,
      snap.arrivals,
      snap.errorBudget,
      snap.pending,
      snap.poolUtil,
      snap.successRate,
      snap.wave,
    ],
  );

  const statusLabel =
    phase === "intro"
      ? "Ready"
      : phase === "running"
        ? `Wave ${snap.wave} · ${snap.t.toFixed(1)}s`
        : phase === "won"
          ? "Held"
          : "Breached";

  return (
    <div className="slo-game">
      {!embedded ? (
        <DrillProseHeader prose={prose} compact={phase !== "intro"} />
      ) : (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="max-w-xl text-[0.95rem] leading-relaxed text-[color:var(--drill-muted)]">
            Three traffic waves. Defaults will not hold Wave 3. Size up, pick
            retries carefully, and shed if you must.
          </p>
          <p className="text-[0.78rem] tabular-nums text-[color:var(--drill-muted)]">
            SLO {(SLO_TARGET * 100).toFixed(1)}% · {DURATION_S}s
          </p>
        </div>
      )}

      <div className={`grid gap-6 lg:grid-cols-12 ${embedded ? "mt-6" : "mt-8"}`}>
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

          {!embedded ? (
            <div className="mb-5 [&_.drill-narrator]:mt-0">
              <DrillNarrator frame={narrator} />
            </div>
          ) : null}

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
                <td>Pool util</td>
                <td>{Math.round(snap.poolUtil * 100)}%</td>
                <td>How full the connection pool is. Near 100% means new work waits.</td>
              </tr>
              <tr>
                <td>Pending</td>
                <td>{snap.pending.toFixed(0)}</td>
                <td>Admitted work waiting for a free pool slot.</td>
              </tr>
              <tr>
                <td>Arrivals</td>
                <td>
                  {snap.arrivals.toFixed(0)} req/s · {snap.retryAmp.toFixed(2)}×
                </td>
                <td>Incoming rate including retry amplification.</td>
              </tr>
              <tr>
                <td>Success rate</td>
                <td>{(snap.successRate * 100).toFixed(2)}%</td>
                <td>
                  Must stay at or above {(SLO_TARGET * 100).toFixed(1)}% for the shift.
                </td>
              </tr>
              <tr>
                <td>Error budget</td>
                <td>{snap.errorBudget.toFixed(0)}%</td>
                <td>Remaining allowed unreliability for this window.</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Meter
              label="Pool utilization"
              tip="How full the connection pool is."
              value={snap.poolUtil}
              format={(n) => `${Math.round(n * 100)}%`}
            />
            <Meter
              label="Pending (awaiting conn)"
              tip="Admitted work waiting for a free pool slot."
              value={snap.pending}
              max={Math.max(20, controls.poolSize)}
              format={(n) => `${n.toFixed(0)}`}
              warnAt={0.35}
              dangerAt={0.7}
            />
            <Meter
              label="Success rate"
              tip="Share of requests that complete successfully."
              value={Math.max(0, 1 - snap.successRate)}
              max={0.05}
              format={() => `${(snap.successRate * 100).toFixed(2)}%`}
              warnAt={0.3}
              dangerAt={0.6}
            />
            <Meter
              label="Error budget left"
              tip="Remaining allowed unreliability for this window."
              value={100 - snap.errorBudget}
              max={100}
              format={() => `${snap.errorBudget.toFixed(0)}%`}
              warnAt={0.45}
              dangerAt={0.75}
            />
          </div>

          <div className="mt-6 h-16 overflow-hidden border border-[color:var(--drill-line)] bg-[color:var(--drill-panel-soft)]">
            <LatencyBars util={snap.poolUtil} risk={snap.cascadeRisk} reduced={reduced} />
          </div>

          {(phase === "won" || phase === "lost") && result ? (
            <GameResultPanel
              outcome={result.outcome}
              score={result.score}
              reason={result.reason}
              takeaway={result.takeaway || takeaway}
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
              label="Pool size"
              tip="How many workers or connections checkout can hold at once."
              help="How many connections checkout can hold at once. Pool caps holds; concurrency caps admission. They are different levers."
              value={controls.poolSize}
            />
            <input
              className="slo-slider mt-3"
              type="range"
              min={25}
              max={220}
              step={5}
              value={controls.poolSize}
              onChange={(e) =>
                setControls((c) => ({ ...c, poolSize: Number(e.target.value) }))
              }
            />
          </label>

          <label className="block">
            <DrillControlLabel
              label="Concurrency limit"
              tip="Hard cap on in-flight work."
              help="Hard cap on in-flight work. Prevents the pool from accepting more than it can finish."
              value={controls.concurrencyLimit}
            />
            <input
              className="slo-slider mt-3"
              type="range"
              min={20}
              max={220}
              step={5}
              value={controls.concurrencyLimit}
              onChange={(e) =>
                setControls((c) => ({
                  ...c,
                  concurrencyLimit: Number(e.target.value),
                }))
              }
            />
          </label>

          <fieldset>
            <legend className="font-medium text-[0.82rem] text-[color:var(--drill-fg)]">
              Retries
            </legend>
            <p className="mt-1.5 text-[0.84rem] leading-relaxed text-[color:var(--drill-muted)]">
              How aggressively failed requests are retried. Aggressive retries
              under saturation multiply load and can cascade.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  ["off", "Off"],
                  ["cautious", "Cautious"],
                  ["aggressive", "Aggressive"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`rounded-full border px-3 py-2 text-sm transition-colors ${
                    controls.retries === value
                      ? "border-[color:var(--drill-signal)] bg-[color-mix(in_srgb,var(--drill-signal)_10%,transparent)] text-[color:var(--drill-signal)]"
                      : "border-[color:var(--drill-line)] text-[color:var(--drill-muted)] hover:border-[color:var(--drill-line-strong)] hover:text-[color:var(--drill-fg)]"
                  }`}
                  aria-pressed={controls.retries === value}
                  onClick={() => setRetry(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="flex items-start gap-3 text-sm text-[color:var(--drill-muted)]">
            <input
              type="checkbox"
              className="mt-1 size-4 accent-[var(--cinnabar)]"
              checked={controls.shedding}
              onChange={(e) =>
                setControls((c) => ({ ...c, shedding: e.target.checked }))
              }
            />
            <span>
              <span className="font-medium text-[color:var(--drill-fg)]">Shed load</span>
              <span className="mt-1.5 block leading-relaxed">
                Refuse some work with 503s so the pool can finish what it already
                accepted. Spends success rate to protect survivors.
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
            ) : (
              <>
                {stepMode ? (
                  <button type="button" className="slo-btn-primary" onClick={applyTick}>
                    Step →
                  </button>
                ) : (
                  <button
                    type="button"
                    className="slo-btn-secondary"
                    onClick={() => {
                      stopLoop();
                      setPhase("intro");
                    }}
                  >
                    Abort
                  </button>
                )}
                {stepMode ? (
                  <button
                    type="button"
                    className="slo-btn-secondary"
                    onClick={() => {
                      stopLoop();
                      setPhase("intro");
                      setSnap(initialSnap);
                    }}
                  >
                    Reset
                  </button>
                ) : null}
              </>
            )}
            <Link href="/play" className="slo-btn-secondary">
              All drills
            </Link>
          </div>

          {!embedded ? <DrillTakeaway>{takeaway}</DrillTakeaway> : null}
        </div>
      </div>
    </div>
  );
}

function LatencyBars({
  util,
  risk,
  reduced,
}: {
  util: number;
  risk: number;
  reduced: boolean;
}) {
  const bars = 48;
  return (
    <div className="flex h-full items-end gap-px px-2 py-2" aria-hidden="true">
      {Array.from({ length: bars }, (_, i) => {
        const wave = Math.sin(i * 0.45 + util * 8) * 0.5 + 0.5;
        const h = 18 + wave * 70 * (0.35 + util) + risk * 20;
        return (
          <span
            key={i}
            className="flex-1 bg-[color:var(--drill-signal)]/80"
            style={{
              height: `${Math.min(100, h)}%`,
              opacity: 0.35 + util * 0.5,
              transition: reduced ? undefined : "height 0.2s linear, opacity 0.2s linear",
            }}
          />
        );
      })}
    </div>
  );
}

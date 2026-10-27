"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DrillControlLabel, DrillTip } from "@/components/play/DrillTip";
import { DrillTeach, type DrillLesson } from "@/components/play/DrillTeach";
import { GameResultPanel } from "@/components/play/GameResultPanel";
import {
  createEngine,
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
import { usePrefersReducedMotion } from "@/lib/motion-prefs";
import { getPlayGame } from "@/data/play-games";

const catalog = getPlayGame("slo-watch");

const initialSnap: TickSnapshot = {
  t: 0,
  wave: 1,
  arrivals: 40,
  inFlight: 0,
  poolUtil: 0,
  successRate: 1,
  errorBudget: 100,
  successes: 0,
  failures: 0,
  cascadeRisk: 0,
  message: "Warm traffic. Defaults won’t survive Wave 3 — size up.",
};

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
    ratio >= dangerAt ? "bg-cinnabar" : ratio >= warnAt ? "bg-amber" : "bg-cream/70";
  return (
    <div>
      <div className="flex justify-between gap-3 text-[0.72rem] tracking-wide text-cream/45">
        {tip ? (
          <DrillTip label={label} tip={tip}>
            <span>{label}</span>
          </DrillTip>
        ) : (
          <span>{label}</span>
        )}
        <span className="tabular-nums text-cream">{format(value)}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden bg-white/15">
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
  // Reduced-motion defaults to step mode; still fully playable without spectacle.
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
      // One automatic tick so meters aren't empty; player advances with Step.
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
        await navigator.share({ title: "SLO Watch — Baodium", text, url });
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

  const lesson = useMemo((): DrillLesson => {
    if (phase === "intro") {
      return {
        experiment:
          "Three traffic waves hit checkout. Defaults will not hold Wave 3 — size capacity, pick retries, shed if you must.",
        seeing:
          "Pool utilization, arrivals, success rate, and remaining error budget. Wave labels mark each surge.",
        why: "An SLO is a promise with a budget. Aggressive retries under saturation spend that budget twice and can cascade.",
        tryNext: "Raise pool size before Wave 3, keep retries cautious, enable shedding if utilization saturates.",
        success:
          catalog?.success ??
          `Hold success rate at ${(SLO_TARGET * 100).toFixed(1)}% for ${DURATION_S}s without cascading.`,
      };
    }
    if (phase === "running") {
      return {
        experiment: `Wave ${snap.wave} is live — occupancy and retries decide whether the budget survives.`,
        seeing: snap.message,
        why:
          controls.retries === "aggressive" && snap.poolUtil > 0.85
            ? "Aggressive retries multiply arrivals while the pool is already full — that spends the budget twice."
            : "Capacity and retries are coupled. Under saturation, more retries usually means more failures, not more recoveries.",
        tryNext:
          snap.errorBudget < 40
            ? "Shed load or cut retries before the budget hits zero."
            : "Watch utilization into the next wave; size up before it crests.",
        success:
          catalog?.success ??
          `Hold success rate at ${(SLO_TARGET * 100).toFixed(1)}% for ${DURATION_S}s without cascading.`,
      };
    }
    if (phase === "won") {
      return {
        experiment: "Checkout held inside the SLO for the full shift.",
        seeing: result?.reason ?? "Error budget survived all three waves.",
        why:
          catalog?.takeaway ??
          "Capacity and retries are coupled under saturation.",
        success: "Win locked. Try aggressive retries once to see the budget burn faster.",
      };
    }
    return {
      experiment: "The budget emptied or the system cascaded.",
      seeing: result?.reason ?? "SLO breached under the waves.",
      why:
        catalog?.takeaway ??
        "Capacity and retries are coupled under saturation.",
      tryNext: "Size the pool, keep retries cautious, and shed before Wave 3 saturates.",
      success:
        catalog?.success ??
        `Hold success rate at ${(SLO_TARGET * 100).toFixed(1)}% for ${DURATION_S}s without cascading.`,
    };
  }, [
    controls.retries,
    phase,
    result,
    snap.errorBudget,
    snap.message,
    snap.poolUtil,
    snap.wave,
  ]);

  return (
    <div className="slo-game">
      {!embedded ? (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-sans text-[0.72rem] font-medium uppercase tracking-[0.22em] text-amber">
              Play · SLO Watch
            </p>
            <h2 className="mt-3 max-w-xl font-serif text-3xl tracking-[-0.02em] md:text-4xl">
              Keep checkout inside the SLO through three waves.
            </h2>
            <p className="mt-4 max-w-xl text-[0.98rem] leading-relaxed text-cream/65">
              Size the pool, cap concurrency, pick retries carefully, shed if you
              must. Empty the{" "}
              <DrillTip
                label="error budget"
                tip="The amount of unreliability an SLO still allows. When it hits zero, you have broken the promise for the window."
              >
                <span className="underline decoration-dotted decoration-cream/35 underline-offset-2">
                  error budget
                </span>
              </DrillTip>{" "}
              or cascade, and you lose.
            </p>
          </div>
          <div className="text-right text-[0.78rem] tabular-nums text-cream/45">
            <p>
              Success{" "}
              <span className="text-cream">
                ≥ {(SLO_TARGET * 100).toFixed(1)}% for {DURATION_S}s
              </span>
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="max-w-xl text-[0.95rem] leading-relaxed text-cream/65">
            Three traffic waves. Defaults will not hold Wave 3 — size up, pick retries carefully,
            shed if you must.
          </p>
          <p className="text-[0.78rem] tabular-nums text-cream/45">
            SLO {(SLO_TARGET * 100).toFixed(1)}% · {DURATION_S}s
          </p>
        </div>
      )}

      {!embedded ? <DrillTeach lesson={lesson} /> : null}

      <div className={`grid gap-6 lg:grid-cols-12 ${embedded ? "mt-6" : "mt-8"}`}>
        <div className="border border-white/12 bg-night/55 p-5 md:p-6 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.72rem] uppercase tracking-[0.18em] text-cream/45">
              {phase === "intro"
                ? "Ready"
                : phase === "running"
                  ? `Wave ${snap.wave} · ${snap.t.toFixed(1)}s`
                  : phase === "won"
                    ? "Held"
                    : "Breached"}
            </p>
            <p className="max-w-sm text-right text-sm text-cream/65">{snap.message}</p>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Meter
              label="Pool utilization"
              tip="How full the worker/connection pool is. Near 100% means new work waits or fails."
              value={snap.poolUtil}
              format={(n) => `${Math.round(n * 100)}%`}
            />
            <Meter
              label="Arrivals"
              tip="Incoming request rate. Retries add to this number under saturation."
              value={snap.arrivals}
              max={280}
              format={(n) => `${n.toFixed(0)} req/s`}
              warnAt={0.55}
              dangerAt={0.75}
            />
            <Meter
              label="Success rate"
              tip="Share of requests that complete successfully. Must stay at or above the SLO target."
              value={Math.max(0, 1 - snap.successRate)}
              max={0.05}
              format={() => `${(snap.successRate * 100).toFixed(2)}%`}
              warnAt={0.3}
              dangerAt={0.6}
            />
            <Meter
              label="Error budget left"
              tip="Remaining allowed unreliability for this window. Hits zero when you have broken the SLO."
              value={100 - snap.errorBudget}
              max={100}
              format={() => `${snap.errorBudget.toFixed(0)}%`}
              warnAt={0.45}
              dangerAt={0.75}
            />
          </div>

          <div className="mt-6 h-16 overflow-hidden border border-white/12 bg-night">
            <LatencyBars util={snap.poolUtil} risk={snap.cascadeRisk} reduced={reduced} />
          </div>

          {(phase === "won" || phase === "lost") && result ? (
            <GameResultPanel
              outcome={result.outcome}
              score={result.score}
              reason={result.reason}
              takeaway={
                getPlayGame("slo-watch")?.takeaway ??
                "Capacity and retries are coupled under saturation."
              }
              chapterHref={result.chapterHref}
              chapterLabel={result.chapterLabel}
              onAgain={start}
              onShare={share}
              copied={copied}
            />
          ) : null}
        </div>

        <div className="flex flex-col gap-5 border border-white/12 p-5 md:p-6 lg:col-span-5">
          <label className="block">
            <DrillControlLabel
              label="Pool size"
              tip="How many workers/connections checkout can hold at once. Effective capacity is min(pool size, concurrency limit)."
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
              tip="Hard cap on in-flight work. Prevents the pool from accepting more than it can finish."
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
            <legend className="flex items-center gap-2 text-[0.78rem] text-cream/45">
              <DrillTip
                label="Retries"
                tip="How aggressively failed requests are retried. Aggressive retries under saturation multiply load and can cascade."
              >
                <span>Retries</span>
              </DrillTip>
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {([
                ["off", "Off"],
                ["cautious", "Cautious"],
                ["aggressive", "Aggressive"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`border px-3 py-2 text-sm transition-colors ${
                    controls.retries === value
                      ? "border-amber text-amber"
                      : "border-white/12 text-cream/65 hover:border-white/25 hover:text-cream"
                  }`}
                  aria-pressed={controls.retries === value}
                  onClick={() => setRetry(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="flex items-start gap-3 text-sm text-cream/65">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--cinnabar)]"
              checked={controls.shedding}
              onChange={(e) =>
                setControls((c) => ({ ...c, shedding: e.target.checked }))
              }
            />
            <span>
              <DrillTip
                label="Shed load"
                tip="Refuse some work with 503s so the pool can finish what it already accepted. Spends success rate to protect survivors."
              >
                <span className="text-cream/80">Shed load</span>
              </DrillTip>
              <span className="mt-0.5 block text-cream/45">
                Accept 503s to protect the pool
              </span>
            </span>
          </label>

          <label className="flex items-center gap-3 text-sm text-cream/65">
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
            <span className="text-cream/45">(default when reduced motion is on)</span>
          </label>

          <div className="mt-auto flex flex-wrap gap-3 pt-2">
            {phase !== "running" ? (
              <button type="button" className="slo-btn-primary" onClick={start}>
                {phase === "intro" ? "Start shift" : "Play again"}
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

          <details className="border border-white/12 p-3 text-sm leading-relaxed text-cream/65">
            <summary className="cursor-pointer text-cream">Assumptions</summary>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Synthetic checkout traffic — not production telemetry.</li>
              <li>
                Capacity is min(pool size, concurrency limit). Occupancy stretches as
                utilization rises (contention).
              </li>
              <li>
                Aggressive retries multiply arrivals under saturation and can cascade —
                the chapter-4 lesson.
              </li>
              <li>Shedding cuts offered load but spends some success rate on 503s.</li>
            </ul>
          </details>
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
            className="flex-1 bg-amber/80"
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

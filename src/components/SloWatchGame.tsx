"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
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
  message: "Warm traffic. Size the pool before the spike.",
};

function Meter({
  label,
  value,
  max = 1,
  format,
  warnAt = 0.8,
  dangerAt = 0.95,
}: {
  label: string;
  value: number;
  max?: number;
  format: (n: number) => string;
  warnAt?: number;
  dangerAt?: number;
}) {
  const ratio = max === 0 ? 0 : Math.min(1.15, value / max);
  const tone =
    ratio >= dangerAt ? "bg-copper" : ratio >= warnAt ? "bg-bronze" : "bg-ink/70";
  return (
    <div>
      <div className="flex justify-between text-[0.72rem] tracking-wide text-faint">
        <span>{label}</span>
        <span className="tabular-nums text-ink">{format(value)}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden bg-line">
        <div
          className={`h-full ${tone}`}
          style={{ width: `${Math.min(100, ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}

export function SloWatchGame({ compact = false }: { compact?: boolean }) {
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
    const url = typeof window !== "undefined" ? `${window.location.origin}/play` : "https://baodium.com/play";
    const text = result.shareText.replace("https://baodium.com/play", url);
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

  return (
    <div className={`slo-game ${compact ? "" : ""}`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-sans text-[0.72rem] font-medium uppercase tracking-[0.22em] text-bronze">
            Play · SLO Watch
          </p>
          <h2 className="mt-3 max-w-xl font-serif text-3xl tracking-[-0.02em] md:text-4xl">
            Keep checkout inside the SLO.
          </h2>
          <p className="mt-4 max-w-xl text-[0.98rem] leading-relaxed text-muted">
            Three traffic waves hit checkout. The defaults will not hold Wave 3 — size the pool,
            cap concurrency, pick retries carefully, shed if you must. Empty the error budget or
            cascade, and you lose.
          </p>
        </div>
        <div className="text-right text-[0.78rem] tabular-nums text-faint">
          <p>
            Target SLO{" "}
            <span className="text-ink">{(SLO_TARGET * 100).toFixed(1)}%</span>
          </p>
          <p className="mt-1">
            Duration <span className="text-ink">{DURATION_S}s</span>
          </p>
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-12">
        <div className="border border-line bg-raise p-5 md:p-6 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.72rem] uppercase tracking-[0.18em] text-faint">
              {phase === "intro"
                ? "Ready"
                : phase === "running"
                  ? `Wave ${snap.wave} · ${snap.t.toFixed(1)}s`
                  : phase === "won"
                    ? "Held"
                    : "Breached"}
            </p>
            <p className="max-w-sm text-right text-sm text-muted">{snap.message}</p>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Meter
              label="Pool utilization"
              value={snap.poolUtil}
              format={(n) => `${Math.round(n * 100)}%`}
            />
            <Meter
              label="Arrivals"
              value={snap.arrivals}
              max={280}
              format={(n) => `${n.toFixed(0)} req/s`}
              warnAt={0.55}
              dangerAt={0.75}
            />
            <Meter
              label="Success rate"
              value={Math.max(0, 1 - snap.successRate)}
              max={0.05}
              format={() => `${(snap.successRate * 100).toFixed(2)}%`}
              warnAt={0.3}
              dangerAt={0.6}
            />
            <Meter
              label="Error budget left"
              value={100 - snap.errorBudget}
              max={100}
              format={() => `${snap.errorBudget.toFixed(0)}%`}
              warnAt={0.45}
              dangerAt={0.75}
            />
          </div>

          <div className="mt-6 h-16 overflow-hidden border border-line bg-bg">
            <LatencyBars util={snap.poolUtil} risk={snap.cascadeRisk} reduced={reduced} />
          </div>

          {(phase === "won" || phase === "lost") && result ? (
            <div
              className={`mt-6 border p-5 ${
                result.outcome === "won" ? "border-bronze" : "border-copper"
              }`}
              role="status"
            >
              <p className="text-[0.72rem] uppercase tracking-[0.18em] text-bronze">
                {result.outcome === "won" ? "You held the SLO" : "SLO breached"}
              </p>
              <p className="mt-3 font-serif text-2xl tracking-[-0.02em] text-ink">
                Score {result.score}
              </p>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">{result.reason}</p>
              <p className="mt-4 text-sm text-muted">
                Read next:{" "}
                <a
                  href={result.chapterHref}
                  className="text-bronze hover:text-ink"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {result.chapterLabel}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" className="btn-primary" onClick={start}>
                  Play again
                </button>
                <button type="button" className="btn-secondary" onClick={share}>
                  {copied ? "Copied" : "Share result"}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-5 border border-line p-5 md:p-6 lg:col-span-5">
          <label className="block">
            <span className="flex justify-between text-[0.78rem] text-faint">
              Pool size
              <span className="tabular-nums text-ink">{controls.poolSize}</span>
            </span>
            <input
              className="lab-slider mt-3"
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
            <span className="flex justify-between text-[0.78rem] text-faint">
              Concurrency limit
              <span className="tabular-nums text-ink">{controls.concurrencyLimit}</span>
            </span>
            <input
              className="lab-slider mt-3"
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
            <legend className="text-[0.78rem] text-faint">Retries</legend>
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
                      ? "border-bronze text-bronze"
                      : "border-line text-muted hover:border-line-strong hover:text-ink"
                  }`}
                  aria-pressed={controls.retries === value}
                  onClick={() => setRetry(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="flex items-center gap-3 text-sm text-muted">
            <input
              type="checkbox"
              className="size-4 accent-[var(--bronze)]"
              checked={controls.shedding}
              onChange={(e) =>
                setControls((c) => ({ ...c, shedding: e.target.checked }))
              }
            />
            Shed load (accept 503s to protect the pool)
          </label>

          <label className="flex items-center gap-3 text-sm text-muted">
            <input
              type="checkbox"
              className="size-4 accent-[var(--bronze)]"
              checked={stepMode}
              onChange={(e) => setStepOverride(e.target.checked)}
              disabled={phase === "running"}
            />
            Step mode
            <span className="text-faint">(default when reduced motion is on)</span>
          </label>

          <div className="mt-auto flex flex-wrap gap-3 pt-2">
            {phase !== "running" ? (
              <button type="button" className="btn-primary" onClick={start}>
                {phase === "intro" ? "Start shift" : "Play again"}
              </button>
            ) : (
              <>
                {stepMode ? (
                  <button type="button" className="btn-primary" onClick={applyTick}>
                    Step →
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary"
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
                    className="btn-secondary"
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
            {!compact ? (
              <Link href="/play" className="btn-secondary">
                Open full play page
              </Link>
            ) : null}
          </div>

          <details className="border border-line p-3 text-sm leading-relaxed text-muted">
            <summary className="cursor-pointer text-ink">Assumptions</summary>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Synthetic checkout traffic — not production telemetry.</li>
              <li>
                Capacity is min(pool size, concurrency limit). Occupancy stretches as
                utilization rises (contention).
              </li>
              <li>
                Aggressive retries multiply arrivals under saturation and can cascade —
                the chapter-6 lesson.
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
            className="flex-1 bg-bronze/80"
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

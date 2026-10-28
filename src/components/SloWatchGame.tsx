"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DrillControlLabel, DrillTip } from "@/components/play/DrillTip";
import { DrillNarrator } from "@/components/play/DrillNarrator";
import { DrillTeach, type DrillLesson } from "@/components/play/DrillTeach";
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
    ratio >= dangerAt ? "bg-cinnabar" : ratio >= warnAt ? "bg-[color:var(--drill-warn)]" : "bg-[color:var(--drill-signal)]";
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
  const takeaway = catalog?.takeaway ?? catalog?.matters ?? "";
  const win =
    catalog?.success ??
    `Hold success rate at ${(SLO_TARGET * 100).toFixed(1)}% for ${DURATION_S}s without cascading.`;

  const lesson = useMemo((): DrillLesson => {
    if (phase === "intro") {
      return {
        simulate:
          "Three traffic waves hit checkout while you choose pool size, concurrency, retries, and shedding.",
        why: "An SLO is a promise with a budget. Aggressive retries under saturation spend that budget twice and can cascade.",
        technologies,
        simulation:
          "Set the dials, then start the shift. Watch pool util, arrivals, success rate, and remaining error budget as each wave lands.",
        interpret: win,
      };
    }
    if (phase === "running") {
      return {
        simulate: `Wave ${snap.wave} is live. Occupancy and retries decide whether the budget survives.`,
        why:
          controls.retries === "aggressive" && snap.poolUtil > 0.85
            ? "Aggressive retries multiply arrivals while the pool is already full, which spends the budget twice."
            : "Capacity and retries are coupled. Under saturation, more retries usually means more failures, not more recoveries.",
        technologies,
        simulation:
          snap.errorBudget < 40
            ? `${snap.message} Shed load or cut retries before the budget hits zero.`
            : `${snap.message} Watch utilization into the next wave and size up before it crests.`,
        interpret: win,
      };
    }
    if (phase === "won") {
      return {
        simulate: "Checkout held inside the SLO for the full shift.",
        why: takeaway || "Capacity and retries are coupled under saturation.",
        technologies,
        simulation: result?.reason ?? "Error budget survived all three waves.",
        interpret: "Win locked. Try aggressive retries once to see the budget burn faster.",
      };
    }
    return {
      simulate: "The budget emptied or the system cascaded.",
      why: takeaway || "Capacity and retries are coupled under saturation.",
      technologies,
      simulation: result?.reason ?? "SLO breached under the waves.",
      interpret:
        "Size the pool, keep retries cautious, and shed before Wave 3 saturates. " + win,
    };
  }, [
    controls.retries,
    phase,
    result,
    snap.errorBudget,
    snap.message,
    snap.poolUtil,
    snap.wave,
    takeaway,
    technologies,
    win,
  ]);

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

  return (
    <div className="slo-game">
      {!embedded ? (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="drill-kicker">Play · SLO Watch</p>
            <h2 className="mt-3 max-w-xl font-serif text-3xl tracking-[-0.02em] text-[color:var(--drill-fg)] md:text-4xl">
              Keep checkout inside the SLO through three waves.
            </h2>
            <p className="mt-4 max-w-xl text-[0.98rem] leading-relaxed text-[color:var(--drill-muted)]">
              Size the pool, cap concurrency, pick retries carefully, shed if you
              must. Empty the{" "}
              <DrillTip
                label="error budget"
                tip="The amount of unreliability an SLO still allows. When it hits zero, you have broken the promise for the window."
              >
                <span className="underline decoration-dotted decoration-[color:var(--drill-faint)] underline-offset-2">
                  error budget
                </span>
              </DrillTip>{" "}
              or cascade, and you lose.
            </p>
          </div>
          <div className="text-right text-[0.78rem] tabular-nums text-[color:var(--drill-muted)]">
            <p>
              Success{" "}
              <span className="text-[color:var(--drill-fg)]">
                ≥ {(SLO_TARGET * 100).toFixed(1)}% for {DURATION_S}s
              </span>
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="max-w-xl text-[0.95rem] leading-relaxed text-[color:var(--drill-muted)]">
            Three traffic waves. Defaults will not hold Wave 3. Size up, pick retries carefully,
            and shed if you must.
          </p>
          <p className="text-[0.78rem] tabular-nums text-[color:var(--drill-muted)]">
            SLO {(SLO_TARGET * 100).toFixed(1)}% · {DURATION_S}s
          </p>
        </div>
      )}

      {!embedded ? <DrillNarrator frame={narrator} /> : null}
      {!embedded ? <DrillTeach lesson={lesson} /> : null}

      <div className={`grid gap-6 lg:grid-cols-12 ${embedded ? "mt-6" : "mt-8"}`}>
        <div className="drill-panel p-5 md:p-6 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.72rem] uppercase tracking-[0.18em] text-[color:var(--drill-muted)]">
              {phase === "intro"
                ? "Ready"
                : phase === "running"
                  ? `Wave ${snap.wave} · ${snap.t.toFixed(1)}s`
                  : phase === "won"
                    ? "Held"
                    : "Breached"}
            </p>
            <p className="max-w-sm text-right text-sm text-[color:var(--drill-muted)]">{snap.message}</p>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Meter
              label="Pool utilization"
              tip="How full the connection pool is. Near 100% means new work waits for a free hold."
              value={snap.poolUtil}
              format={(n) => `${Math.round(n * 100)}%`}
            />
            <Meter
              label="Pending (awaiting conn)"
              tip="Admitted work waiting for a free pool slot. Shows up when concurrency ≫ pool size."
              value={snap.pending}
              max={Math.max(20, controls.poolSize)}
              format={(n) => `${n.toFixed(0)}`}
              warnAt={0.35}
              dangerAt={0.7}
            />
            <Meter
              label="Arrivals (w/ retries)"
              tip="Incoming request rate including retry amplification. Aggressive retries multiply this under saturation."
              value={snap.arrivals}
              max={280}
              format={(n) => `${n.toFixed(0)} req/s · ${snap.retryAmp.toFixed(2)}×`}
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
            <Meter
              label="Concurrency util"
              tip="Admission fill vs concurrency limit (in-flight + pending). Separate from pool util."
              value={snap.concurrencyUtil}
              format={(n) => `${Math.round(n * 100)}%`}
              warnAt={0.8}
              dangerAt={0.95}
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
              takeaway={
                result.takeaway ||
                getPlayGame("slo-watch")?.takeaway ||
                "Capacity and retries are coupled under saturation."
              }
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
          <label className="block">
            <DrillControlLabel
              label="Pool size"
              tip="How many workers/connections checkout can hold at once. Pool caps holds; concurrency caps admission. They are different levers."
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
            <legend className="flex items-center gap-2 text-[0.78rem] text-[color:var(--drill-muted)]">
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
                <span className="text-[color:var(--drill-fg)]">Shed load</span>
              </DrillTip>
              <span className="mt-0.5 block text-[color:var(--drill-muted)]">
                Accept 503s to protect the pool
              </span>
            </span>
          </label>

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
            <span className="text-[color:var(--drill-muted)]">(default when reduced motion is on)</span>
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

          <details className="border border-[color:var(--drill-line)] p-3 text-sm leading-relaxed text-[color:var(--drill-muted)]">
            <summary className="cursor-pointer text-[color:var(--drill-fg)]">Assumptions</summary>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Synthetic checkout traffic. not production telemetry.</li>
              <li>
                Pool size caps concurrent connection holds. Concurrency limit caps
                admission (in-flight + pending). When concurrency ≫ pool, pending grows.
              </li>
              <li>
                Aggressive retries multiply arrivals under saturation and can cascade . 
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

"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
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
import {
  SloWavesViz,
  type SloWavePoint,
} from "@/components/play/viz/SloWavesViz";
import { getPlayGame } from "@/data/play-games";
import { narrateSloWatch } from "@/lib/play/narrator";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";
import {
  DRILL_WINDOWS,
  SLO_CRITERIA,
  type CriterionLive,
  type DrillMode,
} from "@/lib/play/success-criteria";
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

export { SLO_TARGET, DURATION_S };

const catalog = getPlayGame("slo-watch");

const initialSnap: TickSnapshot = emptySloSnap(
  "Warm traffic. Three waves ahead. Watch the budget burn.",
);

const SERIES_CAP = 120;

function liveSloCriteria(
  budget: number,
  successRate: number,
  cascaded: boolean,
  peakUtil: number,
  phase: GamePhase,
): CriterionLive[] {
  const active = phase !== "intro";
  const successFloor = SLO_TARGET - 0.012;
  return SLO_CRITERIA.map((c) => {
    if (c.id === "budget") {
      const met = budget > 0;
      return {
        ...c,
        value: `${budget.toFixed(0)}%`,
        tone: !active ? "idle" : met ? "ok" : "bad",
        met: active ? met : null,
      };
    }
    if (c.id === "success") {
      const met = successRate >= successFloor;
      return {
        ...c,
        value:
          phase === "intro" && successRate <= 0
            ? "—"
            : `${(successRate * 100).toFixed(2)}%`,
        tone: !active ? "idle" : met ? "ok" : "bad",
        met: active ? met : null,
      };
    }
    if (c.id === "cascade") {
      const met = !cascaded;
      return {
        ...c,
        value: cascaded ? "Cascade" : "Clear",
        tone: !active ? "idle" : met ? "ok" : "bad",
        met: active ? met : null,
      };
    }
    const met = peakUtil < 1.2;
    return {
      ...c,
      value: `${(peakUtil * 100).toFixed(0)}%`,
      tone: !active ? "idle" : met ? "ok" : "bad",
      met: active ? met : null,
    };
  });
}

function ControlsPanel({
  controls,
  setControls,
  setRetry,
  stepMode,
  setStepOverride,
  phase,
  paused,
  start,
  applyTick,
  onPause,
  onResume,
  onReset,
  takeaway,
  showTakeaway,
  showAllDrillsLink,
}: {
  controls: Controls;
  setControls: Dispatch<SetStateAction<Controls>>;
  setRetry: (retries: RetryPolicy) => void;
  stepMode: boolean;
  setStepOverride: (v: boolean) => void;
  phase: GamePhase;
  paused: boolean;
  start: () => void;
  applyTick: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  takeaway: string;
  showTakeaway: boolean;
  showAllDrillsLink: boolean;
}) {
  const running = phase === "running";
  return (
    <div className="drill-panel flex flex-col gap-5 p-5 md:p-6">
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
          How aggressively failed requests are retried. Aggressive retries under
          saturation multiply load and can cascade.
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
          disabled={running}
        />
        <span>
          <span className="font-medium text-[color:var(--drill-fg)]">Step mode</span>
          <span className="mt-1.5 block leading-relaxed">
            Advance one simulation tick at a time. Default when reduced motion is
            on.
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
        {showAllDrillsLink ? (
          <Link href="/play" className="slo-btn-secondary">
            All drills
          </Link>
        ) : null}
      </div>

      {showTakeaway ? <DrillTakeaway>{takeaway}</DrillTakeaway> : null}
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
  const [mode, setMode] = useState<DrillMode>("practice");
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [paused, setPaused] = useState(false);
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
  const [series, setSeries] = useState<SloWavePoint[]>([]);
  const [peakUtil, setPeakUtil] = useState(0);
  const [cascaded, setCascaded] = useState(false);
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
    setPeakUtil((prev) => Math.max(prev, next.poolUtil));
    if (state.cascade || next.cascadeRisk >= 0.9) {
      setCascaded(true);
    }
    setSeries((prev) => {
      const point: SloWavePoint = {
        t: next.t,
        wave: next.wave,
        arrivals: next.arrivals,
        successRate: next.successRate,
        errorBudget: next.errorBudget,
        poolUtil: next.poolUtil,
      };
      const merged = [...prev, point];
      return merged.length > SERIES_CAP ? merged.slice(-SERIES_CAP) : merged;
    });
    if (done) {
      stopLoop();
      if (state.cascade) setCascaded(true);
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
    setSeries([]);
    setPeakUtil(0);
    setCascaded(false);
    setPaused(false);
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

  const onPause = useCallback(() => {
    stopLoop();
    setPaused(true);
  }, [stopLoop]);

  const onResume = useCallback(() => {
    if (stepMode) return;
    setPaused(false);
    if (rafRef.current !== null) return;
    const interval = window.setInterval(() => {
      applyTick();
    }, reduced ? TICK_MS * 2 : TICK_MS);
    rafRef.current = interval;
  }, [applyTick, reduced, stepMode]);

  const onReset = useCallback(() => {
    stopLoop();
    engineRef.current = createEngine();
    setPaused(false);
    setPhase("intro");
    setSnap(initialSnap);
    setSeries([]);
    setPeakUtil(0);
    setCascaded(false);
    setResult(null);
  }, [stopLoop]);


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

  const livePeak = Math.max(peakUtil, snap.poolUtil);
  const criteria = useMemo(
    () =>
      liveSloCriteria(
        snap.errorBudget,
        snap.successRate,
        cascaded,
        livePeak,
        phase,
      ),
    [snap.errorBudget, snap.successRate, cascaded, livePeak, phase],
  );

  const prose = useMemo((): DrillProse => {
    const challengeQ = `Can you hold checkout at ${(SLO_TARGET * 100).toFixed(1)}% through three waves?`;
    const objective = `Keep error budget above 0%, finish success ≥ ${((SLO_TARGET - 0.012) * 100).toFixed(1)}%, avoid a cascade, and hold peak pool util under 120% for ${DURATION_S}s.`;

    if (phase === "won" || phase === "lost") {
      return {
        title: "SLO Watch",
        challenge: challengeQ,
        situation: <p>{result?.reason ?? snap.message}</p>,
        objective,
        explore: technologies,
        gettingStarted:
          mode === "challenge"
            ? "Compare budget, success, cascade, and peak util to the pass lines, then adjust the levers and run again."
            : phase === "won"
              ? "Try aggressive retries once to see the budget burn faster."
              : "Watch which pass line failed under which wave, then change pool, concurrency, retries, or shedding and retry.",
        takeaway: result?.takeaway || takeaway,
      };
    }

    return {
      title: "SLO Watch",
      challenge: challengeQ,
      situation: (
        <>
          <p>
            Saturday sale, checkout. Three waves are on the schedule, and the
            machines will not grow during the shift. You choose pool size, how
            much work you admit, how retries behave, and whether to refuse some
            of the load. The page does not tell you the combination that holds
            the line.
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
      objective,
      terms:
        mode === "practice" ? (
          <>
            Pool size caps how many connections checkout can hold at once.
            Concurrency caps how much work you admit. They are different levers:
            sizing the pool without capping admission still queues.
          </>
        ) : undefined,
      explore: technologies,
      gettingStarted:
        mode === "challenge"
          ? "Set the dials, start the shift, and watch arrivals, success rate, error budget, and pool util against the exact pass lines."
          : "Set the dials, then start the shift. Watch pool util, arrivals, success rate, and remaining error budget as each wave lands.",
      takeaway,
    };
  }, [mode, phase, result, snap.message, takeaway, technologies]);

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
        ? paused
          ? `Paused · Wave ${snap.wave} · ${snap.t.toFixed(1)}s`
          : `Wave ${snap.wave} · ${snap.t.toFixed(1)}s`
        : phase === "won"
          ? "Held"
          : "Breached";

  const controlsProps = {
    controls,
    setControls,
    setRetry,
    stepMode,
    setStepOverride,
    phase,
    paused,
    start,
    applyTick,
    onPause,
    onResume,
    onReset,
    takeaway,
  };

  const liveMetrics = (
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
            <td>Pool util</td>
            <td>{Math.round(snap.poolUtil * 100)}%</td>
            <td>How full the connection pool is. Near 100% means new work waits.</td>
          </tr>
          <tr>
            <td>Peak pool util</td>
            <td>{Math.round(livePeak * 100)}%</td>
            <td>Highest util this shift (pass under 120%).</td>
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
              Must finish at or above {((SLO_TARGET - 0.012) * 100).toFixed(1)}%
              for the shift.
            </td>
          </tr>
          <tr>
            <td>Error budget</td>
            <td>{snap.errorBudget.toFixed(0)}%</td>
            <td>Remaining allowed unreliability for this {DURATION_S}s window.</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <PlayMeter
          label="Pool utilization"
          tip="How full the connection pool is."
          value={snap.poolUtil}
          format={(n) => `${Math.round(n * 100)}%`}
        />
        <PlayMeter
          label="Pending (awaiting conn)"
          tip="Admitted work waiting for a free pool slot."
          value={snap.pending}
          max={Math.max(20, controls.poolSize)}
          format={(n) => `${n.toFixed(0)}`}
          warnAt={0.35}
          dangerAt={0.7}
        />
        <PlayMeter
          label="Success rate"
          tip="Share of requests that complete successfully."
          value={Math.max(0, 1 - snap.successRate)}
          max={0.05}
          format={() => `${(snap.successRate * 100).toFixed(2)}%`}
          warnAt={0.3}
          dangerAt={0.6}
        />
        <PlayMeter
          label="Error budget left"
          tip="Remaining allowed unreliability for this window."
          value={100 - snap.errorBudget}
          max={100}
          format={() => `${snap.errorBudget.toFixed(0)}%`}
          warnAt={0.45}
          dangerAt={0.75}
        />
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
  );

  if (embedded) {
    return (
      <div className="slo-game">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="max-w-xl text-[0.95rem] leading-relaxed text-[color:var(--drill-muted)]">
            Three traffic waves. Watch arrivals and the error budget burn.
          </p>
          <p className="text-[0.78rem] tabular-nums text-[color:var(--drill-muted)]">
            SLO {(SLO_TARGET * 100).toFixed(1)}% · {DURATION_S}s
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <SloWavesViz
              series={series}
              duration={DURATION_S}
              liveWave={snap.wave}
            />
            {liveMetrics}
          </div>
          <div className="lg:col-span-5">
            <ControlsPanel
              {...controlsProps}
              showTakeaway={false}
              showAllDrillsLink
            />
          </div>
        </div>
      </div>
    );
  }

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
            <DrillProseHeader prose={prose} compact={phase !== "intro"} />
            <DrillSuccessCriteria
              items={criteria}
              windowSec={DRILL_WINDOWS["slo-watch"]}
              running={phase === "running"}
            />
            <ControlsPanel
              {...controlsProps}
              showTakeaway
              showAllDrillsLink
            />
          </>
        }
        canvas={
          <>
            <SloWavesViz
              series={series}
              duration={DURATION_S}
              liveWave={snap.wave}
            />
            <DrillNarrator frame={narrator} />
            {liveMetrics}
          </>
        }
      />
    </div>
  );
}

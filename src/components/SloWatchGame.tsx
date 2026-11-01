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
import { RunningCode } from "@/components/experience/RunningCode";
import { LearningWorkbench } from "@/components/learning/LearningWorkbench";
import { sloProgram } from "@/lib/experience/running-code";
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
  ACQUIRE_BAR_MS,
  POOL,
  QUERY_MS,
  type Controls,
  type GamePhase,
  type GameResult,
  type TickSnapshot,
} from "@/lib/slo-watch";

export { DURATION_S };

const catalog = getPlayGame("slo-watch");

const initialSnap: TickSnapshot = emptySloSnap();

const SERIES_CAP = 120;

function liveSloCriteria(
  acquireHeadroom: number,
  pending: number,
  phase: GamePhase,
): CriterionLive[] {
  const active = phase !== "intro";
  const acquireMs = Math.max(0, 600 * (1 - acquireHeadroom / 100));
  return SLO_CRITERIA.map((c) => {
    if (c.id === "acquire") {
      const met = acquireMs < ACQUIRE_BAR_MS;
      return {
        ...c,
        value: `${acquireMs.toFixed(0)} ms`,
        tone: !active ? "idle" : met ? "ok" : "bad",
        met: active ? met : null,
      };
    }
    if (c.id === "pending") {
      const met = pending < 1;
      return {
        ...c,
        value: pending.toFixed(0),
        tone: !active ? "idle" : met ? "ok" : "bad",
        met: active ? met : null,
      };
    }
    return {
      ...c,
      value: `${POOL}`,
      tone: !active ? "idle" : "ok",
      met: active ? true : null,
    };
  });
}

function ControlsPanel({
  controls,
  setControls,
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
          label="Exposure"
          tip="Percent of product-page traffic that calls Recommendation."
          help="Percent of product-page traffic that calls Recommendation. 100 percent is the whole arrival rate. The pool stays at 40 connections."
          value={`${controls.exposurePct}%`}
        />
        <input
          className="slo-slider mt-3"
          type="range"
          min={0}
          max={100}
          step={5}
          value={controls.exposurePct}
          onChange={(e) =>
            setControls((c) => ({ ...c, exposurePct: Number(e.target.value) }))
          }
        />
      </label>

      <label className="flex items-start gap-3 text-sm text-[color:var(--drill-muted)]">
        <input
          type="checkbox"
          className="mt-1 size-4 accent-[var(--cinnabar)]"
          checked={controls.flagOff}
          onChange={(e) => setControls((c) => ({ ...c, flagOff: e.target.checked }))}
        />
        <span>
          <span className="font-medium text-[color:var(--drill-fg)]">Flag off for new calls</span>
          <span className="mt-1.5 block leading-relaxed">
            Stops new recommendation calls. A hold that already has a connection finishes. The query stays at {QUERY_MS} ms.
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
    exposurePct: 100,
    flagOff: false,
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

  const technologies = catalog?.technologies ?? ["Feature flags", "Connection pools", "Acquire wait"];
  const takeaway =
    catalog?.takeaway ??
    "Disabling the flag stops new recommendation calls. The query stays near 70 ms.";

  const livePeak = Math.max(peakUtil, snap.poolUtil);
  const criteria = useMemo(
    () =>
      liveSloCriteria(snap.errorBudget, snap.pending, phase),
    [snap.errorBudget, snap.pending, phase],
  );

  const prose = useMemo((): DrillProse => {
    const challengeQ = "Can you clear the 40-connection pool when the burst lands?";
    const objective = `Finish with pending acquisitions at zero and acquire wait under ${ACQUIRE_BAR_MS} ms. The pool stays at ${POOL}. The query stays at ${QUERY_MS} ms.`;

    if (phase === "won" || phase === "lost") {
      return {
        title: "SLO Watch",
        challenge: challengeQ,
        situation: <p>{result?.reason ?? snap.message}</p>,
        objective,
        explore: technologies,
        gettingStarted: "Change exposure or turn the flag off for new calls, then run the burst again.",
        takeaway: result?.takeaway || takeaway,
      };
    }

    return {
      title: "SLO Watch",
      challenge: challengeQ,
      situation: (
        <>
          <p>
            Recommendation allows 40 connections, shared with the home page and checkout.
            About 400 lookups a second at 70 ms use 28 of them. Then the arrival rate
            rises by about 1.7 times, and the spare connections fill.
          </p>
          <p>
            Acquire wait is the time spent waiting for a connection. The query itself
            stays near 70 ms. Turning the flag off stops new recommendation calls.
            Making the pool bigger is not the response.
          </p>
        </>
      ),
      objective,
      terms:
        mode === "practice" ? (
          <>
            Exposure is the share of product-page traffic that calls Recommendation.
            The flag, when off, stops new calls. A connection already held is left to finish.
          </>
        ) : undefined,
      explore: technologies,
      gettingStarted:
        "Start with full exposure and watch pending acquisitions during the burst. Then cut exposure or turn the flag off and let the queue finish.",
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
        errorBudget: snap.errorBudget,
        flagOff: controls.flagOff,
        exposurePct: controls.exposurePct,
      }),
    [
      controls.exposurePct,
      controls.flagOff,
      phase,
      snap.arrivals,
      snap.errorBudget,
      snap.pending,
      snap.poolUtil,
      snap.wave,
    ],
  );

  const stageName = snap.t < 16 ? "Estimate" : "Burst";
  const statusLabel =
    phase === "intro"
      ? "Ready"
      : phase === "running"
        ? paused
          ? `Paused · ${stageName} · ${snap.t.toFixed(1)}s`
          : `${stageName} · ${snap.t.toFixed(1)}s`
        : phase === "won"
          ? "Pending finished"
          : "Still pending";

  const controlsProps = {
    controls,
    setControls,
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
            <td>Pool</td>
            <td>{Math.round(snap.poolUtil * 100)}% of {POOL}</td>
            <td>How full the 40 connections are. The pool does not grow.</td>
          </tr>
          <tr>
            <td>Query</td>
            <td>{QUERY_MS} ms</td>
            <td>The database hold. It stays here while acquire time moves.</td>
          </tr>
          <tr>
            <td>Pending</td>
            <td>{snap.pending.toFixed(0)}</td>
            <td>Lookups waiting for a connection.</td>
          </tr>
          <tr>
            <td>Lookups</td>
            <td>{snap.arrivals.toFixed(0)}/s</td>
            <td>Recommendation calls still being attempted.</td>
          </tr>
          <tr>
            <td>Acquire headroom</td>
            <td>{snap.errorBudget.toFixed(0)}%</td>
            <td>100 percent is no queue. 0 percent is the 600 ms acquire tail.</td>
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
          max={80}
          format={(n) => `${n.toFixed(0)}`}
          warnAt={0.35}
          dangerAt={0.7}
        />
        <PlayMeter
          label="Share of the run under 50 ms"
          tip="How much of the run so far kept acquire wait under 50 ms."
          value={snap.successRate}
          format={(n) => `${(n * 100).toFixed(0)}%`}
        />
        <PlayMeter
          label="Clear of the 600 ms tail"
          tip="Headroom between the current acquire wait and the 600 ms incident."
          value={snap.errorBudget / 100}
          format={() => `${snap.errorBudget.toFixed(0)}%`}
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
            The 40-connection pool, then the burst. Watch pending acquisitions and acquire wait.
          </p>
          <p className="text-[0.78rem] tabular-nums text-[color:var(--drill-muted)]">
            Query {QUERY_MS} ms · {DURATION_S}s
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <RunningCode
              program={sloProgram({
                exposurePct: controls.exposurePct,
                flagOff: controls.flagOff,
                arrivals: snap.arrivals,
                pending: snap.pending,
                poolPct: snap.poolUtil * 100,
                headroom: snap.errorBudget,
                elapsed: snap.t,
                reduced,
              })}
              onEdit={(id, value) =>
                setControls((current) => ({ ...current, [id]: value }))
              }
            />
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
            <RunningCode
              program={sloProgram({
                exposurePct: controls.exposurePct,
                flagOff: controls.flagOff,
                arrivals: snap.arrivals,
                pending: snap.pending,
                poolPct: snap.poolUtil * 100,
                headroom: snap.errorBudget,
                elapsed: snap.t,
                reduced,
              })}
              onEdit={(id, value) =>
                setControls((current) => ({ ...current, [id]: value }))
              }
            />
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

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
import { CacheHeatmapViz } from "@/components/play/viz/CacheHeatmapViz";
import { getPlayGame } from "@/data/play-games";
import { narrateCacheRoulette } from "@/lib/play/narrator";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";
import {
  CACHE_CRITERIA,
  DRILL_WINDOWS,
  type CriterionLive,
  type DrillMode,
} from "@/lib/play/success-criteria";
import {
  CACHE_DURATION_S,
  CACHE_TICK_MS,
  createCache,
  emptyCacheSnap,
  tickCache,
  type CacheControls,
  type CacheResult,
  type CacheSnap,
} from "@/lib/play/cache-roulette";

const catalog = getPlayGame("cache-roulette");

const idleSnap: CacheSnap = emptyCacheSnap(
  "Warm cache. Keys expire on a TTL. Watch origin when they do.",
);

function liveCacheCriteria(
  hitRate: number,
  stampededSec: number,
  peakOriginLoad: number,
  phase: "intro" | "running" | "won" | "lost",
): CriterionLive[] {
  const active = phase !== "intro";
  return CACHE_CRITERIA.map((c) => {
    if (c.id === "hitRate") {
      const met = hitRate >= 0.7;
      return {
        ...c,
        value: `${(hitRate * 100).toFixed(0)}%`,
        tone: !active ? "idle" : met ? "ok" : "bad",
        met: active ? met : null,
      };
    }
    if (c.id === "stampede") {
      const met = stampededSec < 2.2;
      return {
        ...c,
        value: `${stampededSec.toFixed(1)}s`,
        tone: !active ? "idle" : met ? "ok" : "bad",
        met: active ? met : null,
      };
    }
    const met = peakOriginLoad < 1.45;
    return {
      ...c,
      value: `${peakOriginLoad.toFixed(2)}×`,
      tone: !active ? "idle" : met ? "ok" : "bad",
      met: active ? met : null,
    };
  });
}

export function CacheRouletteGame() {
  const reduced = usePrefersReducedMotion();
  const [mode, setMode] = useState<DrillMode>("practice");
  const [phase, setPhase] = useState<"intro" | "running" | "won" | "lost">("intro");
  const [paused, setPaused] = useState(false);
  const [controls, setControls] = useState<CacheControls>({
    ttlSec: 6,
    singleflight: false,
    softTtl: false,
    originWorkers: 8,
  });
  const [snap, setSnap] = useState<CacheSnap>(idleSnap);
  const [result, setResult] = useState<CacheResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [stepOverride, setStepOverride] = useState<boolean | null>(null);
  const stepMode = stepOverride ?? reduced;

  const engineRef = useRef(createCache());
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
    const { state, snap: next, done } = tickCache(
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
    engineRef.current = createCache();
    setResult(null);
    setCopied(false);
    setSnap(emptyCacheSnap("Run started. Watch the next TTL edge."));
    setPaused(false);
    setPhase("running");
    if (stepMode) {
      applyTick();
      return;
    }
    loopRef.current = window.setInterval(
      applyTick,
      reduced ? CACHE_TICK_MS * 2 : CACHE_TICK_MS,
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
      reduced ? CACHE_TICK_MS * 2 : CACHE_TICK_MS,
    );
  }, [applyTick, reduced, stepMode]);

  const onReset = useCallback(() => {
    stop();
    engineRef.current = createCache();
    setPaused(false);
    setPhase("intro");
    setSnap(idleSnap);
    setResult(null);
  }, [stop]);


  const share = async () => {
    if (!result) return;
    const url = `${typeof window !== "undefined" ? window.location.origin : "https://baodium.com"}/play/cache-roulette`;
    const text = `Cache Roulette on Baodium. score ${result.score}. ${result.takeaway} ${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Cache Roulette · Baodium", text, url });
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
    ["TTL caches", "Singleflight / coalescing", "Soft TTL (SWR)", "Origin fill latency", "Thundering herd"];
  const takeaway =
    catalog?.takeaway ??
    "Without request coalescing, a TTL expiry becomes an origin stampede.";

  const criteria = useMemo(
    () =>
      liveCacheCriteria(
        snap.hitRate,
        snap.stampededSec,
        snap.peakOriginLoad,
        phase,
      ),
    [snap.hitRate, snap.stampededSec, snap.peakOriginLoad, phase],
  );

  const prose = useMemo((): DrillProse => {
    const challengeQ =
      "Can you survive a hot-key expiry without stampeding origin?";
    const objective = `Hit rate ≥ 70%, stampede window under 2.2s, and peak origin load under 1.45× for ${CACHE_DURATION_S}s.`;

    if (phase === "won" || phase === "lost") {
      return {
        title: "Cache Roulette",
        challenge: challengeQ,
        situation: <p>{result?.reason ?? snap.message}</p>,
        objective,
        explore: technologies,
        gettingStarted:
          mode === "challenge"
            ? "Compare hit rate, stampede seconds, and peak origin to the pass lines, then adjust the levers and run again."
            : phase === "won"
              ? "Try a shorter TTL next to pressure the same defenses."
              : "Watch which pass line failed at the expiry edge, then change TTL, workers, or coalesce settings and retry.",
        takeaway: result?.takeaway ?? takeaway,
      };
    }

    return {
      title: "Cache Roulette",
      challenge: challengeQ,
      situation:
        mode === "challenge" ? (
          <>
            <p>
              Friday afternoon, the product cache. One key is most of the
              reads. It expires on a timer, and every client that misses tries
              to fill from origin in the same moment. Origin is a small pool.
            </p>
            <p>
              You can change how long an entry stays fresh, how many origin
              workers you have, and how misses are filled. The page does not
              say which of those keeps origin inside its limit.
            </p>
          </>
        ) : (
          <>
            <p>
              Friday afternoon, the product cache. A popular key stays fresh
              for a fixed{" "}
              <DrillTip
                label="TTL"
                tip="Time-to-live: how long a cached key stays valid before it must be refreshed from origin."
              >
                <span className="text-[color:var(--drill-fg)]">TTL</span>
              </DrillTip>
              . When it expires, every waiting client may try to refresh from
              origin at once.
            </p>
            <p>
              That herd can fill a small origin pool even though each client is
              doing the reasonable thing: the value was missing, so it asked.
            </p>
          </>
        ),
      objective,
      terms:
        mode === "practice" ? (
          <>
            <span className="text-[color:var(--drill-fg)]">Singleflight</span>{" "}
            coalesces concurrent misses so only one fetch goes to origin.{" "}
            <span className="text-[color:var(--drill-fg)]">Soft TTL</span> keeps
            serving a slightly stale value while one background refresh updates
            the cache.
          </>
        ) : undefined,
      explore: technologies,
      gettingStarted:
        mode === "challenge"
          ? "Choose TTL and origin workers, start the run, and watch hit rate, stampede seconds, and origin load at each expiry."
          : "Choose TTL, origin workers, and whether to coalesce misses. Then start and watch hit rate, origin load, and in-flight misses at each expiry.",
      takeaway,
    };
  }, [mode, phase, result, snap.message, takeaway, technologies]);

  const statusLabel =
    phase === "intro"
      ? "Ready"
      : phase === "running"
        ? paused
          ? `Paused · ${snap.t.toFixed(1)}s${snap.stampeded ? " · stampede" : ""}`
          : `${snap.t.toFixed(1)}s${snap.stampeded ? " · stampede" : ""}`
        : phase === "won"
          ? "Coalesced"
          : "Stampeded";

  const running = phase === "running";
  const ttlSec = snap.ttlSec || controls.ttlSec;

  return (
    <div className="slo-game">
      <LearningWorkbench
        rail={
          <>
            <DrillModeBar mode={mode} onChange={setMode} disabled={running} />
            <DrillProseHeader prose={prose} compact={phase !== "intro"} />
            <DrillSuccessCriteria
              items={criteria}
              windowSec={DRILL_WINDOWS["cache-roulette"]}
              running={running}
            />

            <div className="drill-panel flex flex-col gap-5 p-5 md:p-6">
              <DrillPanelHeading>Adjust your settings</DrillPanelHeading>

              <label className="block">
                <DrillControlLabel
                  label="TTL"
                  tip="Time-to-live in seconds."
                  help="How long a cached key stays valid. Shorter TTLs mean more expiry storms and more pressure on origin."
                  value={`${controls.ttlSec}s`}
                />
                <input
                  className="slo-slider mt-3"
                  type="range"
                  min={2}
                  max={14}
                  step={1}
                  value={controls.ttlSec}
                  onChange={(e) =>
                    setControls((c) => ({ ...c, ttlSec: Number(e.target.value) }))
                  }
                />
              </label>

              <label className="block">
                <DrillControlLabel
                  label="Origin workers"
                  tip="How many concurrent origin fetches the backend can handle."
                  help="How many concurrent origin fetches the backend can handle. The herd saturates this pool when misses are not coalesced."
                  value={controls.originWorkers}
                />
                <input
                  className="slo-slider mt-3"
                  type="range"
                  min={3}
                  max={16}
                  step={1}
                  value={controls.originWorkers}
                  onChange={(e) =>
                    setControls((c) => ({
                      ...c,
                      originWorkers: Number(e.target.value),
                    }))
                  }
                />
              </label>

              <label className="flex items-start gap-3 text-sm text-[color:var(--drill-muted)]">
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-[var(--cinnabar)]"
                  checked={controls.singleflight}
                  onChange={(e) =>
                    setControls((c) => ({ ...c, singleflight: e.target.checked }))
                  }
                />
                <span>
                  <span className="font-medium text-[color:var(--drill-fg)]">
                    Singleflight
                  </span>
                  <span className="mt-1.5 block leading-relaxed">
                    Coalesce concurrent misses into one origin fetch. Other waiters
                    share that result instead of each punching origin.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 text-sm text-[color:var(--drill-muted)]">
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-[var(--cinnabar)]"
                  checked={controls.softTtl}
                  onChange={(e) =>
                    setControls((c) => ({ ...c, softTtl: e.target.checked }))
                  }
                />
                <span>
                  <span className="font-medium text-[color:var(--drill-fg)]">
                    Soft TTL
                  </span>
                  <span className="mt-1.5 block leading-relaxed">
                    Serve a slightly stale value while one background revalidate
                    updates the cache. Users stay warm during the fill.
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
            <CacheHeatmapViz
              t={snap.t}
              ttlSec={ttlSec}
              keyAge={snap.keyAge}
              filling={snap.filling}
              fillRemainingSec={snap.fillRemainingSec}
              singleflight={controls.singleflight}
              softTtl={controls.softTtl}
              waitingOnFill={snap.waitingOnFill}
              inFlightMisses={snap.inFlightMisses}
              originLoad={snap.originLoad}
              stampeded={snap.stampeded}
            />

            <DrillNarrator
              frame={narrateCacheRoulette({
                phase,
                hitRate: snap.hitRate,
                originLoad: snap.originLoad,
                originWorkers: controls.originWorkers,
                singleflight: controls.singleflight,
                softTtl: controls.softTtl,
                ttlSec: controls.ttlSec,
                stampeded: snap.stampeded,
                inFlightMisses: snap.inFlightMisses,
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
                    <td>Hit rate</td>
                    <td>{(snap.hitRate * 100).toFixed(0)}%</td>
                    <td>Share of requests served from cache.</td>
                  </tr>
                  <tr>
                    <td>Stampede window</td>
                    <td>{snap.stampededSec.toFixed(1)}s</td>
                    <td>Seconds spent in a stampede this run (pass under 2.2s).</td>
                  </tr>
                  <tr>
                    <td>Origin load</td>
                    <td>{snap.originLoad.toFixed(2)}×</td>
                    <td>How busy origin workers are right now.</td>
                  </tr>
                  <tr>
                    <td>Peak origin</td>
                    <td>{snap.peakOriginLoad.toFixed(2)}×</td>
                    <td>Highest origin load this run (pass under 1.45×).</td>
                  </tr>
                  <tr>
                    <td>In-flight misses</td>
                    <td>{snap.inFlightMisses}</td>
                    <td>
                      Concurrent cache misses hitting origin. A herd drives this up
                      for the whole fill latency.
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <PlayMeter
                  label="Hit rate"
                  tip="Share of requests served from cache."
                  value={Math.max(0, 1 - snap.hitRate)}
                  max={0.5}
                  format={() => `${(snap.hitRate * 100).toFixed(0)}%`}
                  warnAt={0.4}
                  dangerAt={0.7}
                />
                <PlayMeter
                  label="Origin load"
                  tip="How busy origin workers are."
                  value={snap.originLoad}
                  max={1.45}
                  format={(n) => `${n.toFixed(2)}×`}
                  warnAt={0.7}
                  dangerAt={0.95}
                />
                <PlayMeter
                  label="Peak origin"
                  tip="Highest origin load this run."
                  value={snap.peakOriginLoad}
                  max={1.45}
                  format={(n) => `${n.toFixed(2)}×`}
                  warnAt={0.7}
                  dangerAt={0.95}
                />
                <PlayMeter
                  label={
                    snap.filling
                      ? `Fill · ${snap.fillRemainingSec.toFixed(1)}s`
                      : "In-flight misses"
                  }
                  tip="Concurrent cache misses hitting origin right now."
                  value={snap.inFlightMisses}
                  max={80}
                  format={(n) => `${n}`}
                  warnAt={0.2}
                  dangerAt={0.5}
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

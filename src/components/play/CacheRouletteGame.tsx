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

const idleSnap: CacheSnap = emptyCacheSnap();

function liveCacheCriteria(
  origin: number,
  unavailable: number,
  fresh: boolean,
  phase: "intro" | "running" | "won" | "lost",
): CriterionLive[] {
  const active = phase !== "intro";
  return CACHE_CRITERIA.map((c) => {
    if (c.id === "origin") {
      const met = !fresh && origin === 1;
      return {
        ...c,
        value: `${origin}`,
        tone: !active ? "idle" : met ? "ok" : "bad",
        met: active ? met : null,
      };
    }
    if (c.id === "permit") {
      const met = unavailable === 0 && origin === 1;
      return {
        ...c,
        value: `${unavailable}`,
        tone: !active ? "idle" : met ? "ok" : "warn",
        met: active ? met : null,
      };
    }
    return {
      ...c,
      value: fresh ? "Fresh" : "Miss",
      tone: !active ? "idle" : fresh ? "warn" : "ok",
      met: active ? !fresh : null,
    };
  });
}

export function CacheRouletteGame() {
  const reduced = usePrefersReducedMotion();
  const [mode, setMode] = useState<DrillMode>("practice");
  const [phase, setPhase] = useState<"intro" | "running" | "won" | "lost">("intro");
  const [paused, setPaused] = useState(false);
  const [controls, setControls] = useState<CacheControls>({
    readers: 80,
    fresh: false,
    singleflight: false,
    permit: true,
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
    setSnap(emptyCacheSnap("The key has missed. Watch how many catalog reads that produces."));
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

  const technologies = catalog?.technologies ?? ["Cache-aside", "TTL", "Shared loader", "Source permits"];
  const takeaway =
    catalog?.takeaway ??
    "A miss shares one loader, and that loader needs a source permit.";

  const criteria = useMemo(
    () => liveCacheCriteria(snap.inFlightMisses, snap.waitingOnFill, controls.fresh, phase),
    [controls.fresh, phase, snap.inFlightMisses, snap.waitingOnFill],
  );

  const prose = useMemo((): DrillProse => {
    const challengeQ = "Can one catalog read fill a missed product-metadata key?";
    const objective = `One catalog read for the miss, and unavailable responses at zero, for ${CACHE_DURATION_S}s.`;

    if (phase === "won" || phase === "lost") {
      return {
        title: "Cache Roulette",
        challenge: challengeQ,
        situation: <p>{result?.reason ?? snap.message}</p>,
        objective,
        explore: technologies,
        gettingStarted:
          mode === "challenge"
            ? "Compare catalog reads with the reader count, then share one loader and run again."
            : phase === "won"
              ? "Turn the shared loader off once and watch Catalog see every reader."
              : "The miss is still calling Catalog once per reader, or the source permit is missing.",
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
              The key is product-metadata:v1. It is cache-aside, with a 300 second TTL.
              This run is the miss: every reader would call Catalog unless they share one loader.
            </p>
            <p>
              The loader also has to acquire a source permit. Without it, readers get
              source_read_limit and Catalog stays idle.
            </p>
          </>
        ) : (
          <>
            <p>
              The key is product-metadata:v1, kept for 300 seconds. While it is fresh,
              Catalog is not called. This drill starts from the miss.
            </p>
            <p>
              Readers that do not share a loader each call catalog_db.fetch_metadata.
              The loader that does run still needs source_reads.try_acquire.
            </p>
          </>
        ),
      objective,
      terms:
        mode === "practice" ? (
          <>
            A shared loader means one catalog read for every waiter on the key.
            A source permit is what lets that loader call Catalog.
          </>
        ) : undefined,
      explore: technologies,
      gettingStarted:
        mode === "challenge"
          ? "Start on the miss, then share one loader and keep the source permit."
          : "Start with each reader loading alone. Then share one loader and watch Catalog fall to one read.",
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
                  label="Readers on this key"
                  tip="How many requests miss product-metadata:v1 together."
                  help="How many requests miss product-metadata:v1 together. Without a shared loader, each one calls Catalog."
                  value={controls.readers}
                />
                <input
                  className="slo-slider mt-3"
                  type="range"
                  min={1}
                  max={120}
                  step={1}
                  value={controls.readers}
                  onChange={(e) => setControls((c) => ({ ...c, readers: Number(e.target.value) }))}
                />
              </label>

              <label className="flex items-start gap-3 text-sm text-[color:var(--drill-muted)]">
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-[var(--cinnabar)]"
                  checked={controls.fresh}
                  onChange={(e) => setControls((c) => ({ ...c, fresh: e.target.checked }))}
                />
                <span>
                  <span className="font-medium text-[color:var(--drill-fg)]">Entry is fresh</span>
                  <span className="mt-1.5 block leading-relaxed">
                    On, the 300 second TTL still holds and Catalog is not called. Off, the key has missed.
                  </span>
                </span>
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
                  <span className="font-medium text-[color:var(--drill-fg)]">Share one loader</span>
                  <span className="mt-1.5 block leading-relaxed">
                    On, every waiter on this key uses one loader. Catalog should see one read.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 text-sm text-[color:var(--drill-muted)]">
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-[var(--cinnabar)]"
                  checked={controls.permit}
                  onChange={(e) => setControls((c) => ({ ...c, permit: e.target.checked }))}
                />
                <span>
                  <span className="font-medium text-[color:var(--drill-fg)]">Source permit</span>
                  <span className="mt-1.5 block leading-relaxed">
                    On, try_acquire returns a permit and the loader may read Catalog. Off, readers get source_read_limit.
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
              ttlSec={snap.ttlSec}
              singleflight={controls.singleflight}
              waitingOnFill={snap.waitingOnFill}
              inFlightMisses={snap.inFlightMisses}
              fresh={controls.fresh}
              permit={controls.permit}
              readers={controls.readers}
            />

            <DrillNarrator
              frame={narrateCacheRoulette({
                phase,
                readers: controls.readers,
                origin: snap.inFlightMisses,
                fresh: controls.fresh,
                singleflight: controls.singleflight,
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
                    <td>Catalog reads</td>
                    <td>{snap.inFlightMisses}</td>
                    <td>fetch_metadata calls this miss produces.</td>
                  </tr>
                  <tr>
                    <td>Unavailable</td>
                    <td>{snap.waitingOnFill}</td>
                    <td>Readers who got source_read_limit.</td>
                  </tr>
                  <tr>
                    <td>TTL</td>
                    <td>{snap.ttlSec}s</td>
                    <td>How long a fresh product-metadata entry is kept.</td>
                  </tr>
                  <tr>
                    <td>Readers</td>
                    <td>{snap.rps}</td>
                    <td>Requests on this one key.</td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <PlayMeter
                  label="Catalog reads"
                  tip="fetch_metadata calls this missed key produces. The pass is one."
                  value={snap.inFlightMisses}
                  max={Math.max(8, controls.readers)}
                  format={(n) => `${n.toFixed(0)}`}
                  warnAt={0.15}
                  dangerAt={0.3}
                />
                <PlayMeter
                  label="Unavailable"
                  tip="Readers who got source_read_limit because the permit was missing."
                  value={snap.waitingOnFill}
                  max={Math.max(8, controls.readers)}
                  format={(n) => `${n.toFixed(0)}`}
                  warnAt={0.05}
                  dangerAt={0.15}
                />
                <PlayMeter
                  label="TTL"
                  tip="How long a fresh product-metadata entry is kept. This drill is the miss."
                  value={snap.ttlSec}
                  max={300}
                  format={(n) => `${n.toFixed(0)} s`}
                  warnAt={1}
                  dangerAt={1}
                />
                <PlayMeter
                  label="Readers"
                  tip="Requests on product-metadata:v1."
                  value={controls.readers}
                  max={120}
                  format={(n) => `${n.toFixed(0)}`}
                  warnAt={0.7}
                  dangerAt={0.9}
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

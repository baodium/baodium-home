"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DrillControlLabel, DrillTip } from "@/components/play/DrillTip";
import { DrillNarrator } from "@/components/play/DrillNarrator";
import { DrillTeach, type DrillLesson } from "@/components/play/DrillTeach";
import { GameResultPanel } from "@/components/play/GameResultPanel";
import { PlayMeter } from "@/components/play/PlayMeter";
import { getPlayGame } from "@/data/play-games";
import { narrateCacheRoulette } from "@/lib/play/narrator";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";
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
  "Warm cache. Keys expire on a TTL. watch origin when they do.",
);

export function CacheRouletteGame() {
  const reduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState<"intro" | "running" | "won" | "lost">("intro");
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
    setSnap(emptyCacheSnap("Run started. watch the next TTL edge."));
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
  const takeaway = catalog?.takeaway ?? catalog?.matters ?? "";
  const win =
    catalog?.success ??
    "Hold hit rate high and keep origin load under capacity for the full run.";

  const lesson = useMemo((): DrillLesson => {
    if (phase === "intro") {
      return {
        simulate:
          "A hot key expires on a timer. Without coalescing, every waiting client fetches origin at once (a thundering herd).",
        why: "TTL expiry is normal. The outage comes from N identical refreshes competing for limited origin workers.",
        technologies,
        simulation:
          "Turn on singleflight before you start. Optionally enable soft TTL, then run the drill. Watch hit rate, origin load, and in-flight misses during the fill window.",
        interpret: win,
      };
    }
    if (phase === "running") {
      if (snap.stampeded) {
        return {
          simulate:
            "Expiry just turned into a herd. Many clients are punching origin together.",
          why: "Without singleflight, each miss is independent. Soft TTL alone cannot stop a herd if every client still refreshes.",
          technologies,
          simulation: `${snap.inFlightMisses} in-flight misses · origin load ${(snap.originLoad * 100).toFixed(0)}%. Enable singleflight (and soft TTL if you want users served stale while one revalidate runs).`,
          interpret: win,
        };
      }
      if (controls.singleflight && controls.softTtl) {
        return {
          simulate: "Singleflight and soft TTL are on: one revalidate, users stay warm.",
          why: "Stale-while-revalidate keeps hit rate up while one leader refreshes. Origin sees one worker, not a stampede.",
          technologies,
          simulation: `${snap.message} Shorten TTL and watch whether origin stays calm under more expiry storms.`,
          interpret: win,
        };
      }
      if (controls.singleflight) {
        return {
          simulate: "Singleflight is on. Concurrent misses coalesce to one leader.",
          why: "Others wait for the leader’s result instead of each calling origin. That is request coalescing.",
          technologies,
          simulation: `${snap.message} Enable soft TTL so users keep getting a response while the leader revalidates.`,
          interpret: win,
        };
      }
      return {
        simulate: "Keys are expiring without coalescing. Origin will take the heat.",
        why: "A short TTL means more expiry storms. Origin workers are the capacity wall the herd hits.",
        technologies,
        simulation: `${snap.message} Enable singleflight before the next expiry, or raise TTL / origin workers to buy time.`,
        interpret: win,
      };
    }
    if (phase === "won") {
      return {
        simulate: "Origin lived through expiry. Coalescing beat the herd.",
        why: result?.takeaway ?? takeaway,
        technologies,
        simulation: result?.reason ?? "Hit rate held and origin stayed under capacity.",
        interpret: "You met the win condition. Try a shorter TTL next to pressure the same defenses.",
      };
    }
    return {
      simulate: "The herd won. Expiry became an origin stampede or hit rate collapsed.",
      why: result?.takeaway ?? takeaway,
      technologies,
      simulation: result?.reason ?? "Origin overloaded or the cache spent more than it saved.",
      interpret: "Reset with singleflight on before the first expiry, then add soft TTL.",
    };
  }, [
    controls.singleflight,
    controls.softTtl,
    phase,
    result,
    snap.inFlightMisses,
    snap.message,
    snap.originLoad,
    snap.stampeded,
    takeaway,
    technologies,
    win,
  ]);

  return (
    <div className="slo-game">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="drill-kicker">
            Play · Cache Roulette
          </p>
          <h1 className="mt-3 max-w-xl font-serif text-3xl tracking-[-0.02em] md:text-4xl">
            Stop a cache expiry from stampeding origin.
          </h1>
          <p className="mt-4 max-w-xl text-[0.98rem] leading-relaxed text-[color:var(--drill-muted)]">
            Keys expire on a{" "}
            <DrillTip
              label="TTL"
              tip="Time-to-live: how long a cached key stays valid before it must be refreshed from origin."
            >
              <span className="underline decoration-dotted decoration-[color:var(--drill-faint)] underline-offset-2">
                TTL
              </span>
            </DrillTip>
            . Coalesce concurrent misses, or watch every client hit origin at
            once for {CACHE_DURATION_S}s.
          </p>
        </div>
        <p className="text-[0.78rem] tabular-nums text-[color:var(--drill-muted)]">
          Success{" "}
          <span className="text-[color:var(--drill-fg)]">
            hit rate ≥ 72% · no sustained stampede
          </span>
        </p>
      </div>

      <DrillTeach lesson={lesson} compact={phase !== "intro"} />

      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <div className="drill-panel p-5 md:p-6 lg:col-span-7">
          <div className="mb-5 [&_.drill-narrator]:mt-0">
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
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.72rem] uppercase tracking-[0.18em] text-[color:var(--drill-muted)]">
              {phase === "intro"
                ? "Ready"
                : phase === "running"
                  ? `${snap.t.toFixed(1)}s${snap.stampeded ? " · stampede" : ""}`
                  : phase === "won"
                    ? "Coalesced"
                    : "Stampeded"}
            </p>
            <p className="max-w-sm text-right text-sm text-[color:var(--drill-muted)]">{snap.message}</p>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <PlayMeter
              label="Hit rate"
              tip="Share of requests served from cache. Soft TTL keeps this high while a background refresh runs."
              value={Math.max(0, 1 - snap.hitRate)}
              max={0.5}
              format={() => `${(snap.hitRate * 100).toFixed(0)}%`}
              warnAt={0.4}
              dangerAt={0.7}
            />
            <PlayMeter
              label="Origin load"
              tip="How busy origin workers are. Above ~100% means the refresh herd saturated the backend."
              value={snap.originLoad}
              max={1}
              format={(n) => `${(n * 100).toFixed(0)}%`}
              warnAt={0.75}
              dangerAt={1}
            />
            <PlayMeter
              label="Peak origin"
              tip="Highest origin load this run. Win/fail uses peak during fill windows, not the recovered end state."
              value={snap.peakOriginLoad}
              max={1.5}
              format={(n) => `${(n * 100).toFixed(0)}%`}
              warnAt={0.7}
              dangerAt={0.9}
            />
            <PlayMeter
              label={snap.filling ? `Fill · ${snap.fillRemainingSec.toFixed(1)}s` : "In-flight misses"}
              tip="Concurrent cache misses hitting origin right now. During a fill, singleflight keeps this near 1; a herd drives it to ~RPS for the whole fill latency."
              value={snap.inFlightMisses}
              max={80}
              format={(n) => `${n}`}
              warnAt={0.2}
              dangerAt={0.5}
            />
          </div>
          <div
            className={`mt-6 h-14 overflow-hidden border ${
              snap.stampeded ? "border-cinnabar" : "border-[color:var(--drill-line)]"
            } bg-[color:var(--drill-panel-soft)]`}
            aria-hidden="true"
          >
            <HerdBars load={snap.originLoad} stampeded={snap.stampeded} reduced={reduced} />
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
          <label className="block">
            <DrillControlLabel
              label="TTL"
              tip="Time-to-live in seconds. Shorter TTLs mean more expiry storms and more pressure on origin."
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
              tip="How many concurrent origin fetches the backend can handle. The herd saturates this pool when misses are not coalesced."
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
              className="mt-0.5 size-4 accent-[var(--cinnabar)]"
              checked={controls.singleflight}
              onChange={(e) =>
                setControls((c) => ({ ...c, singleflight: e.target.checked }))
              }
            />
            <span>
              <DrillTip
                label="Singleflight"
                tip="Request coalescing: when many clients miss the same key, only one fetch goes to origin; the others wait for that result."
              >
                <span className="text-[color:var(--drill-fg)]">Singleflight</span>
              </DrillTip>
              <span className="mt-0.5 block text-[color:var(--drill-muted)]">
                Coalesce concurrent misses into one origin fetch
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm text-[color:var(--drill-muted)]">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--cinnabar)]"
              checked={controls.softTtl}
              onChange={(e) =>
                setControls((c) => ({ ...c, softTtl: e.target.checked }))
              }
            />
            <span>
              <DrillTip
                label="Soft TTL"
                tip="Stale-while-revalidate: after soft expiry, keep serving the old value while one background refresh updates the cache."
              >
                <span className="text-[color:var(--drill-fg)]">Soft TTL</span>
              </DrillTip>
              <span className="mt-0.5 block text-[color:var(--drill-muted)]">
                Serve stale while one revalidate runs
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
              tip="Advance one simulation tick at a time. Default when reduced motion is on. fully playable without animation."
            >
              <span>Step mode</span>
            </DrillTip>
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
          <p className="text-sm leading-relaxed text-[color:var(--drill-muted)]">
            Turn on singleflight before the first expiry. Soft TTL keeps users
            on a response while one revalidate runs.
          </p>
        </div>
      </div>
    </div>
  );
}

function HerdBars({
  load,
  stampeded,
  reduced,
}: {
  load: number;
  stampeded: boolean;
  reduced: boolean;
}) {
  const bars = 40;
  return (
    <div className="flex h-full items-end gap-px px-2 py-2">
      {Array.from({ length: bars }, (_, i) => {
        const wave = Math.sin(i * 0.55 + load * 6) * 0.5 + 0.5;
        const h = 20 + wave * 70 * (0.3 + load) + (stampeded ? 18 : 0);
        return (
          <span
            key={i}
            className={stampeded ? "flex-1 bg-cinnabar/80" : "flex-1 bg-[color:var(--drill-signal)]/80"}
            style={{
              height: `${Math.min(100, h)}%`,
              opacity: 0.35 + Math.min(1, load) * 0.5,
              transition: reduced ? undefined : "height 0.2s linear, opacity 0.2s linear",
            }}
          />
        );
      })}
    </div>
  );
}

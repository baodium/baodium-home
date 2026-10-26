"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GameResultPanel } from "@/components/play/GameResultPanel";
import { PlayMeter } from "@/components/play/PlayMeter";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";
import {
  CACHE_DURATION_S,
  CACHE_TICK_MS,
  createCache,
  tickCache,
  type CacheControls,
  type CacheResult,
  type CacheSnap,
} from "@/lib/play/cache-roulette";

const initial: CacheSnap = {
  t: 0,
  hitRate: 0.95,
  originLoad: 0.1,
  inFlightMisses: 0,
  stampeded: false,
  rps: 120,
  message: "Warm cache. Keys expire — watch the herd.",
};

export function CacheRouletteGame() {
  const reduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState<"intro" | "running" | "won" | "lost">("intro");
  const [controls, setControls] = useState<CacheControls>({
    ttlSec: 6,
    singleflight: false,
    softTtl: false,
    originWorkers: 8,
  });
  const [snap, setSnap] = useState<CacheSnap>(initial);
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
    setSnap(initial);
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
    const text = `Cache Roulette on Baodium — score ${result.score}. ${result.takeaway} ${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Cache Roulette — Baodium", text, url });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    }
  };

  return (
    <div className="slo-game">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-sans text-[0.72rem] font-medium uppercase tracking-[0.22em] text-amber">
            Play · Cache Roulette
          </p>
          <h1 className="mt-3 max-w-xl font-serif text-3xl tracking-[-0.02em] md:text-4xl">
            Spin the TTL. Survive the herd.
          </h1>
          <p className="mt-4 max-w-xl text-[0.98rem] leading-relaxed text-cream/65">
            Keys expire on a timer. Coalesce misses or watch origin take a stampede
            for {CACHE_DURATION_S}s.
          </p>
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-12">
        <div className="border border-white/12 bg-night/55 p-5 md:p-6 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.72rem] uppercase tracking-[0.18em] text-cream/45">
              {phase === "intro"
                ? "Ready"
                : phase === "running"
                  ? `${snap.t.toFixed(1)}s${snap.stampeded ? " · stampede" : ""}`
                  : phase === "won"
                    ? "Coalesced"
                    : "Stampeded"}
            </p>
            <p className="max-w-sm text-right text-sm text-cream/65">{snap.message}</p>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <PlayMeter
              label="Hit rate"
              value={Math.max(0, 1 - snap.hitRate)}
              max={0.5}
              format={() => `${(snap.hitRate * 100).toFixed(0)}%`}
              warnAt={0.4}
              dangerAt={0.7}
            />
            <PlayMeter
              label="Origin load"
              value={snap.originLoad}
              max={1}
              format={(n) => `${(n * 100).toFixed(0)}%`}
              warnAt={0.75}
              dangerAt={1}
            />
            <PlayMeter
              label="In-flight misses"
              value={snap.inFlightMisses}
              max={80}
              format={(n) => `${n}`}
              warnAt={0.2}
              dangerAt={0.5}
            />
            <PlayMeter
              label="Request rate"
              value={snap.rps}
              max={220}
              format={(n) => `${n.toFixed(0)} rps`}
              warnAt={0.7}
              dangerAt={0.9}
            />
          </div>
          <div
            className={`mt-6 h-14 overflow-hidden border ${
              snap.stampeded ? "border-cinnabar" : "border-white/12"
            } bg-night`}
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
            <span className="flex justify-between text-[0.78rem] text-cream/45">
              TTL
              <span className="tabular-nums text-cream">{controls.ttlSec}s</span>
            </span>
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
            <span className="flex justify-between text-[0.78rem] text-cream/45">
              Origin workers
              <span className="tabular-nums text-cream">{controls.originWorkers}</span>
            </span>
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
          <label className="flex items-center gap-3 text-sm text-cream/65">
            <input
              type="checkbox"
              className="size-4 accent-[var(--cinnabar)]"
              checked={controls.singleflight}
              onChange={(e) =>
                setControls((c) => ({ ...c, singleflight: e.target.checked }))
              }
            />
            Singleflight (coalesce misses)
          </label>
          <label className="flex items-center gap-3 text-sm text-cream/65">
            <input
              type="checkbox"
              className="size-4 accent-[var(--cinnabar)]"
              checked={controls.softTtl}
              onChange={(e) =>
                setControls((c) => ({ ...c, softTtl: e.target.checked }))
              }
            />
            Soft TTL (stale-while-revalidate)
          </label>
          <label className="flex items-center gap-3 text-sm text-cream/65">
            <input
              type="checkbox"
              className="size-4 accent-[var(--cinnabar)]"
              checked={stepMode}
              onChange={(e) => setStepOverride(e.target.checked)}
              disabled={phase === "running"}
            />
            Step mode
          </label>
          <div className="mt-auto flex flex-wrap gap-3 pt-2">
            {phase !== "running" ? (
              <button type="button" className="slo-btn-primary" onClick={start}>
                {phase === "intro" ? "Spin cache" : "Play again"}
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
                  setPhase("intro");
                }}
              >
                Abort
              </button>
            )}
          </div>
          <p className="text-sm leading-relaxed text-cream/45">
            Hint: turn on singleflight before the first expiry — soft TTL keeps
            users warm while one revalidate runs.
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
            className={stampeded ? "flex-1 bg-cinnabar/80" : "flex-1 bg-amber/80"}
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

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GameResultPanel } from "@/components/play/GameResultPanel";
import { PlayMeter } from "@/components/play/PlayMeter";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";
import {
  createSurge,
  P95_LIMIT_MS,
  SURGE_DURATION_S,
  SURGE_TICK_MS,
  tickSurge,
  type SurgeControls,
  type SurgeResult,
  type SurgeSnap,
} from "@/lib/play/traffic-surge";

const initial: SurgeSnap = {
  t: 0,
  arrivals: 40,
  admitted: 40,
  served: 0,
  shed: 0,
  queue: 0,
  p95: 60,
  successRate: 1,
  happyMs: 0,
  message: "Calm morning. Spike lands around 12s — decide who waits.",
};

export function TrafficSurgeGame() {
  const reduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState<"intro" | "running" | "won" | "lost">("intro");
  const [controls, setControls] = useState<SurgeControls>({
    admit: 0.85,
    queueCap: 120,
    vipFirst: true,
  });
  const [snap, setSnap] = useState<SurgeSnap>(initial);
  const [result, setResult] = useState<SurgeResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [stepOverride, setStepOverride] = useState<boolean | null>(null);
  const stepMode = stepOverride ?? reduced;

  const engineRef = useRef(createSurge());
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
    const { state, snap: next, done } = tickSurge(engineRef.current, controlsRef.current);
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
    engineRef.current = createSurge();
    setResult(null);
    setCopied(false);
    setSnap(initial);
    setPhase("running");
    if (stepMode) {
      applyTick();
      return;
    }
    loopRef.current = window.setInterval(applyTick, reduced ? SURGE_TICK_MS * 2 : SURGE_TICK_MS);
  }, [applyTick, reduced, stepMode, stop]);

  useEffect(() => () => stop(), [stop]);

  const share = async () => {
    if (!result) return;
    const url = `${typeof window !== "undefined" ? window.location.origin : "https://baodium.com"}/play/traffic-surge`;
    const text =
      result.outcome === "won"
        ? `Shaped the surge in Baodium Traffic Surge (score ${result.score}). ${url}`
        : `Traffic Surge got me (score ${result.score}). Can you hold p95? ${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Traffic Surge — Baodium", text, url });
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
            Play · Traffic Surge
          </p>
          <h1 className="mt-3 max-w-xl font-serif text-3xl tracking-[-0.02em] md:text-4xl">
            Shape the spike. Protect latency.
          </h1>
          <p className="mt-4 max-w-xl text-[0.98rem] leading-relaxed text-cream/65">
            Admissions and queue caps decide who waits. Keep p95 under {P95_LIMIT_MS}ms
            for {SURGE_DURATION_S}s without starving the floor.
          </p>
        </div>
        <p className="text-[0.78rem] tabular-nums text-cream/45">
          p95 budget <span className="text-cream">{P95_LIMIT_MS}ms</span>
        </p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-12">
        <div className="border border-white/12 bg-night/55 p-5 md:p-6 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.72rem] uppercase tracking-[0.18em] text-cream/45">
              {phase === "intro"
                ? "Ready"
                : phase === "running"
                  ? `${snap.t.toFixed(1)}s`
                  : phase === "won"
                    ? "Held"
                    : "Breached"}
            </p>
            <p className="max-w-sm text-right text-sm text-cream/65">{snap.message}</p>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <PlayMeter
              label="Arrivals"
              value={snap.arrivals}
              max={240}
              format={(n) => `${n.toFixed(0)} rps`}
              warnAt={0.5}
              dangerAt={0.75}
            />
            <PlayMeter
              label="Queue"
              value={snap.queue}
              max={controls.queueCap}
              format={(n) => `${n.toFixed(0)}`}
            />
            <PlayMeter
              label="p95 latency"
              value={snap.p95}
              max={P95_LIMIT_MS}
              format={(n) => `${n.toFixed(0)} ms`}
              warnAt={0.85}
              dangerAt={1}
            />
            <PlayMeter
              label="Success rate"
              value={Math.max(0, 1 - snap.successRate)}
              max={0.4}
              format={() => `${(snap.successRate * 100).toFixed(0)}%`}
              warnAt={0.35}
              dangerAt={0.7}
            />
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
              Admit rate
              <span className="tabular-nums text-cream">
                {Math.round(controls.admit * 100)}%
              </span>
            </span>
            <input
              className="slo-slider mt-3"
              type="range"
              min={0.35}
              max={1}
              step={0.05}
              value={controls.admit}
              onChange={(e) =>
                setControls((c) => ({ ...c, admit: Number(e.target.value) }))
              }
            />
          </label>
          <label className="block">
            <span className="flex justify-between text-[0.78rem] text-cream/45">
              Queue cap
              <span className="tabular-nums text-cream">{controls.queueCap}</span>
            </span>
            <input
              className="slo-slider mt-3"
              type="range"
              min={40}
              max={220}
              step={10}
              value={controls.queueCap}
              onChange={(e) =>
                setControls((c) => ({ ...c, queueCap: Number(e.target.value) }))
              }
            />
          </label>
          <label className="flex items-center gap-3 text-sm text-cream/65">
            <input
              type="checkbox"
              className="size-4 accent-[var(--cinnabar)]"
              checked={controls.vipFirst}
              onChange={(e) =>
                setControls((c) => ({ ...c, vipFirst: e.target.checked }))
              }
            />
            VIP first when shedding
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
                {phase === "intro" ? "Start surge" : "Play again"}
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
            Hint: at peak (~200 rps) you cannot admit everyone. Shed before the
            queue cooks p95.
          </p>
        </div>
      </div>
    </div>
  );
}

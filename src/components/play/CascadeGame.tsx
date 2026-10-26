"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GameResultPanel } from "@/components/play/GameResultPanel";
import { PlayMeter } from "@/components/play/PlayMeter";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";
import {
  CASCADE_DURATION_S,
  CASCADE_TICK_MS,
  createCascade,
  tickCascade,
  type CascadeControls,
  type CascadeResult,
  type CascadeSnap,
  type NodeId,
} from "@/lib/play/cascade";

const initial: CascadeSnap = {
  t: 0,
  health: { edge: 1, auth: 1, pay: 1, db: 1 },
  circuitOpen: { auth: false, pay: false, db: false },
  checkoutOk: 0,
  cascadeRisk: 0.1,
  message: "All green. Auth starts wobbling around 8s.",
};

const NODES: { id: NodeId; label: string }[] = [
  { id: "edge", label: "Edge" },
  { id: "auth", label: "Auth" },
  { id: "pay", label: "Pay" },
  { id: "db", label: "DB" },
];

export function CascadeGame() {
  const reduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState<"intro" | "running" | "won" | "lost">("intro");
  const [controls, setControls] = useState<CascadeControls>({
    tripAt: 0.35,
    bulkheadAuth: false,
    bulkheadPay: false,
    timeoutMs: 150,
  });
  const [snap, setSnap] = useState<CascadeSnap>(initial);
  const [result, setResult] = useState<CascadeResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [stepOverride, setStepOverride] = useState<boolean | null>(null);
  const stepMode = stepOverride ?? reduced;

  const engineRef = useRef(createCascade());
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
    const { state, snap: next, done } = tickCascade(
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
    engineRef.current = createCascade();
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
      reduced ? CASCADE_TICK_MS * 2 : CASCADE_TICK_MS,
    );
  }, [applyTick, reduced, stepMode, stop]);

  useEffect(() => () => stop(), [stop]);

  const share = async () => {
    if (!result) return;
    const url = `${typeof window !== "undefined" ? window.location.origin : "https://baodium.com"}/play/cascade`;
    const text = `Cascade on Baodium — score ${result.score}. ${result.takeaway} ${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Cascade — Baodium", text, url });
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
            Play · Cascade
          </p>
          <h1 className="mt-3 max-w-xl font-serif text-3xl tracking-[-0.02em] md:text-4xl">
            Stop the outage from fanning out.
          </h1>
          <p className="mt-4 max-w-xl text-[0.98rem] leading-relaxed text-cream/65">
            Auth and DB will wobble. Trip circuits, add bulkheads, fail fast —
            keep checkout alive for {CASCADE_DURATION_S}s.
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
                  ? `${snap.t.toFixed(1)}s`
                  : phase === "won"
                    ? "Contained"
                    : "Spread"}
            </p>
            <p className="max-w-sm text-right text-sm text-cream/65">{snap.message}</p>
          </div>

          <div
            className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
            aria-label="Dependency health"
          >
            {NODES.map((node) => {
              const h = snap.health[node.id];
              const open =
                node.id !== "edge" &&
                snap.circuitOpen[node.id as "auth" | "pay" | "db"];
              return (
                <div
                  key={node.id}
                  className={`border p-3 transition-colors duration-300 ${
                    h < 0.45
                      ? "border-cinnabar/80 bg-cinnabar/15"
                      : h < 0.75
                        ? "border-amber/50 bg-amber/10"
                        : "border-white/12 bg-night/40"
                  }`}
                >
                  <p className="text-[0.68rem] uppercase tracking-[0.14em] text-cream/45">
                    {node.label}
                    {open ? " · open" : ""}
                  </p>
                  <p className="mt-2 font-serif text-2xl tabular-nums text-cream">
                    {Math.round(h * 100)}
                    <span className="text-base text-cream/45">%</span>
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <PlayMeter
              label="Cascade risk"
              value={snap.cascadeRisk}
              format={(n) => `${Math.round(n * 100)}%`}
              warnAt={0.45}
              dangerAt={0.7}
            />
            <PlayMeter
              label="Checkout ok"
              value={snap.checkoutOk}
              max={2000}
              format={(n) => `${n.toFixed(0)}`}
              warnAt={0.3}
              dangerAt={0.15}
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
              Trip circuit at
              <span className="tabular-nums text-cream">
                {Math.round(controls.tripAt * 100)}% errors
              </span>
            </span>
            <input
              className="slo-slider mt-3"
              type="range"
              min={0.15}
              max={0.7}
              step={0.05}
              value={controls.tripAt}
              onChange={(e) =>
                setControls((c) => ({ ...c, tripAt: Number(e.target.value) }))
              }
            />
          </label>
          <label className="block">
            <span className="flex justify-between text-[0.78rem] text-cream/45">
              Timeout
              <span className="tabular-nums text-cream">{controls.timeoutMs}ms</span>
            </span>
            <input
              className="slo-slider mt-3"
              type="range"
              min={60}
              max={280}
              step={10}
              value={controls.timeoutMs}
              onChange={(e) =>
                setControls((c) => ({
                  ...c,
                  timeoutMs: Number(e.target.value),
                }))
              }
            />
          </label>
          <label className="flex items-center gap-3 text-sm text-cream/65">
            <input
              type="checkbox"
              className="size-4 accent-[var(--cinnabar)]"
              checked={controls.bulkheadAuth}
              onChange={(e) =>
                setControls((c) => ({ ...c, bulkheadAuth: e.target.checked }))
              }
            />
            Bulkhead Auth
          </label>
          <label className="flex items-center gap-3 text-sm text-cream/65">
            <input
              type="checkbox"
              className="size-4 accent-[var(--cinnabar)]"
              checked={controls.bulkheadPay}
              onChange={(e) =>
                setControls((c) => ({ ...c, bulkheadPay: e.target.checked }))
              }
            />
            Bulkhead Pay
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
                  setPhase("intro");
                }}
              >
                Abort
              </button>
            )}
          </div>
          <p className="text-sm leading-relaxed text-cream/45">
            Hint: trip early and isolate Auth — shared pools turn one bad
            dependency into a site outage.
          </p>
        </div>
      </div>
    </div>
  );
}

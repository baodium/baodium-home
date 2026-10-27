"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DrillControlLabel, DrillTip } from "@/components/play/DrillTip";
import { DrillTeach, type DrillLesson } from "@/components/play/DrillTeach";
import { GameResultPanel } from "@/components/play/GameResultPanel";
import { PlayMeter } from "@/components/play/PlayMeter";
import { getPlayGame } from "@/data/play-games";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";
import {
  CASCADE_DURATION_S,
  CASCADE_TICK_MS,
  createCascade,
  emptyCascadeSnap,
  tickCascade,
  type CascadeControls,
  type CascadeResult,
  type CascadeSnap,
  type NodeId,
} from "@/lib/play/cascade";

const catalog = getPlayGame("cascade");

const idleSnap: CascadeSnap = emptyCascadeSnap(
  "All green. Auth starts wobbling around 8s.",
);

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
  const [snap, setSnap] = useState<CascadeSnap>(idleSnap);
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
    setSnap(emptyCascadeSnap("Faults inject at ~8s — trip early, isolate budgets."));
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

  const lesson = useMemo((): DrillLesson => {
    if (phase === "intro") {
      return {
        experiment:
          "One dependency will degrade. Circuits and bulkheads decide whether the blast stays local or takes checkout down.",
        seeing:
          "Four dependency health tiles, cascade risk, and checkout throughput. Watch Auth wobble first.",
        why: "Shared pools turn one slow dependency into thread starvation everywhere — unless you isolate failure domains.",
        tryNext: "Trip circuits early and enable the Auth bulkhead before you start.",
        success:
          catalog?.success ??
          "Keep checkout alive through the wobble without a site-wide outage.",
      };
    }
    if (phase === "running") {
      const openCount = Object.values(snap.circuitOpen).filter(Boolean).length;
      return {
        experiment:
          snap.cascadeRisk > 0.55
            ? "Cascade risk is high — failure is spreading across shared capacity."
            : "Dependencies are under stress. Isolation only works when both trip and bulkhead land.",
        seeing: `${snap.message}${openCount ? ` · ${openCount} circuit(s) open` : ""}`,
        why:
          controls.bulkheadAuth && openCount > 0
            ? "An open circuit stops calling the sick dependency; a bulkhead keeps its waiters from consuming the shared pool."
            : "A circuit without a bulkhead still shares the blast radius through the thread/connection pool.",
        tryNext:
          !controls.bulkheadAuth
            ? "Enable Bulkhead Auth — isolate the first wobbling dependency."
            : "Trip earlier or shorten timeouts if health keeps falling.",
        success:
          catalog?.success ??
          "Keep checkout alive through the wobble without a site-wide outage.",
      };
    }
    if (phase === "won") {
      return {
        experiment: "Contained — checkout stayed up while a dependency failed.",
        seeing: result?.reason ?? "Blast radius stayed local.",
        why: result?.takeaway ?? catalog?.takeaway ?? "",
        success: "Win locked. Try without the Auth bulkhead to see the spread return.",
      };
    }
    return {
      experiment: "The outage fanned out — checkout fell with the dependency.",
      seeing: result?.reason ?? "Cascade risk won.",
      why: result?.takeaway ?? catalog?.takeaway ?? "",
      tryNext: "Trip early and isolate Auth. Shared pools turn one bad dependency into a site outage.",
      success:
        catalog?.success ??
        "Keep checkout alive through the wobble without a site-wide outage.",
    };
  }, [
    controls.bulkheadAuth,
    phase,
    result,
    snap.cascadeRisk,
    snap.circuitOpen,
    snap.message,
  ]);

  return (
    <div className="slo-game">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-sans text-[0.72rem] font-medium uppercase tracking-[0.22em] text-amber">
            Play · Cascade
          </p>
          <h1 className="mt-3 max-w-xl font-serif text-3xl tracking-[-0.02em] md:text-4xl">
            Keep one bad dependency from taking the site down.
          </h1>
          <p className="mt-4 max-w-xl text-[0.98rem] leading-relaxed text-cream/65">
            Auth and DB will wobble. Trip{" "}
            <DrillTip
              label="circuits"
              tip="A circuit breaker stops calling a failing dependency after enough errors, so callers fail fast instead of waiting."
            >
              <span className="underline decoration-dotted decoration-cream/35 underline-offset-2">
                circuits
              </span>
            </DrillTip>
            , add{" "}
            <DrillTip
              label="bulkheads"
              tip="A bulkhead isolates a dependency onto its own pool of threads or connections so its waiters cannot starve the rest of the system."
            >
              <span className="underline decoration-dotted decoration-cream/35 underline-offset-2">
                bulkheads
              </span>
            </DrillTip>
            , fail fast — keep checkout alive for {CASCADE_DURATION_S}s.
          </p>
        </div>
        <p className="text-[0.78rem] tabular-nums text-cream/45">
          Success <span className="text-cream">checkout stays up</span>
        </p>
      </div>

      <DrillTeach lesson={lesson} />

      <div className="mt-8 grid gap-6 lg:grid-cols-12">
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
              tip="Estimated chance the failure fans out through shared capacity. Falls when circuits and bulkheads isolate the sick path."
              value={snap.cascadeRisk}
              format={(n) => `${Math.round(n * 100)}%`}
              warnAt={0.45}
              dangerAt={0.7}
            />
            <PlayMeter
              label="Checkout ok rate"
              tip="Successful checkouts over attempts. Circuits + bulkheads keep this up while a dependency is sick."
              value={
                snap.checkoutOk + snap.checkoutFail <= 0
                  ? 0
                  : 1 - snap.checkoutOk / (snap.checkoutOk + snap.checkoutFail)
              }
              max={0.5}
              format={() => {
                const total = snap.checkoutOk + snap.checkoutFail;
                if (total <= 0) return "—";
                return `${((snap.checkoutOk / total) * 100).toFixed(0)}%`;
              }}
              warnAt={0.35}
              dangerAt={0.6}
            />
            <PlayMeter
              label="Auth util"
              tip="Auth concurrency budget fill. Without a bulkhead this shares the edge/pay pool."
              value={snap.util.auth}
              max={1}
              format={(n) => `${Math.round(n * 100)}%`}
              warnAt={0.75}
              dangerAt={1}
            />
            <PlayMeter
              label="Pay util"
              tip="Pay concurrency budget fill. Isolation stops auth sickness from consuming these slots."
              value={snap.util.pay}
              max={1}
              format={(n) => `${Math.round(n * 100)}%`}
              warnAt={0.75}
              dangerAt={1}
            />
          </div>

          {(phase === "won" || phase === "lost") && result ? (
            <GameResultPanel
              outcome={result.outcome}
              score={result.score}
              reason={result.reason}
              takeaway={result.takeaway}
              debrief={result.debrief}
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
            <DrillControlLabel
              label="Trip circuit at"
              tip="Error-rate threshold that opens the circuit. Lower means you stop calling the sick dependency sooner."
              value={`${Math.round(controls.tripAt * 100)}% errors`}
            />
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
            <DrillControlLabel
              label="Timeout"
              tip="How long a caller waits on a dependency before failing. Shorter timeouts free capacity faster when the dependency is stuck."
              value={`${controls.timeoutMs}ms`}
            />
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
          <label className="flex items-start gap-3 text-sm text-cream/65">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--cinnabar)]"
              checked={controls.bulkheadAuth}
              onChange={(e) =>
                setControls((c) => ({ ...c, bulkheadAuth: e.target.checked }))
              }
            />
            <span>
              <DrillTip
                label="Bulkhead Auth"
                tip="Give Auth its own connection/thread pool so Auth waiters cannot starve Pay, DB, or Edge work."
              >
                <span className="text-cream/80">Bulkhead Auth</span>
              </DrillTip>
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm text-cream/65">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--cinnabar)]"
              checked={controls.bulkheadPay}
              onChange={(e) =>
                setControls((c) => ({ ...c, bulkheadPay: e.target.checked }))
              }
            />
            <span>
              <DrillTip
                label="Bulkhead Pay"
                tip="Isolate Pay the same way — useful when payment latency would otherwise consume the shared pool."
              >
                <span className="text-cream/80">Bulkhead Pay</span>
              </DrillTip>
            </span>
          </label>
          <label className="flex items-center gap-3 text-sm text-cream/65">
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
          <p className="text-sm leading-relaxed text-cream/45">
            Trip early and isolate Auth — shared pools turn one bad dependency
            into a site outage.
          </p>
        </div>
      </div>
    </div>
  );
}

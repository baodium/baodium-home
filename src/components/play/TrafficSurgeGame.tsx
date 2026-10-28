"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DrillControlLabel, DrillTip } from "@/components/play/DrillTip";
import { DrillNarrator } from "@/components/play/DrillNarrator";
import { DrillTeach, type DrillLesson } from "@/components/play/DrillTeach";
import { GameResultPanel } from "@/components/play/GameResultPanel";
import { PlayMeter } from "@/components/play/PlayMeter";
import { getPlayGame } from "@/data/play-games";
import { narrateTrafficSurge } from "@/lib/play/narrator";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";
import {
  createSurge,
  emptySurgeSnap,
  P95_LIMIT_MS,
  SURGE_DURATION_S,
  SURGE_TICK_MS,
  tickSurge,
  type SurgeControls,
  type SurgeResult,
  type SurgeSnap,
} from "@/lib/play/traffic-surge";

const catalog = getPlayGame("traffic-surge");

const idleSnap: SurgeSnap = emptySurgeSnap(
  "Calm morning. Spike lands around 12s. decide who waits.",
);

export function TrafficSurgeGame() {
  const reduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState<"intro" | "running" | "won" | "lost">("intro");
  const [controls, setControls] = useState<SurgeControls>({
    admit: 0.85,
    queueCap: 120,
    vipFirst: true,
  });
  const [snap, setSnap] = useState<SurgeSnap>(idleSnap);
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
    setSnap(emptySurgeSnap("Spike incoming. decide admit rate before 12s."));
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
        await navigator.share({ title: "Traffic Surge · Baodium", text, url });
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
    ["Admission control", "Queue caps", "Load shedding", "p95 latency", "VIP priority"];
  const takeaway = catalog?.takeaway ?? catalog?.matters ?? "";
  const win =
    catalog?.success ??
    `Keep p95 under ${P95_LIMIT_MS}ms for ${SURGE_DURATION_S}s while still serving most traffic.`;

  const lesson = useMemo((): DrillLesson => {
    if (phase === "intro") {
      return {
        simulate:
          "Arrivals spike around 12s against fixed capacity. Admit rate and queue cap decide who waits and whether p95 survives.",
        why: "Serving everyone slowly serves no one. Early shedding protects the customers you can still help.",
        technologies,
        simulation:
          "Lower admit before the spike, or keep VIP-first shedding ready, then start. Watch arrivals, queue depth, p95, and success rate together.",
        interpret: win,
      };
    }
    if (phase === "running") {
      return {
        simulate:
          snap.t < 12
            ? "Calm traffic for now. The spike is coming, so set the dials before it lands."
            : "Spike is live. Queue depth and p95 tell you whether shedding is early enough.",
        why:
          snap.p95 > P95_LIMIT_MS * 0.9
            ? "A full queue turns wait time into latency. Shed load before p95 cooks past the budget."
            : "Admit rate is load shedding by another name: refuse some work so the rest stays fast.",
        technologies,
        simulation:
          snap.queue > controls.queueCap * 0.8
            ? `${snap.message} Drop admit rate or lower the queue cap before latency breaches.`
            : `${snap.message} Hold the line through the peak; nudge VIP-first if success rate dips unevenly.`,
        interpret: win,
      };
    }
    if (phase === "won") {
      return {
        simulate: "You shaped the spike. Latency stayed inside the budget.",
        why: result?.takeaway ?? takeaway,
        technologies,
        simulation: result?.reason ?? "p95 held while enough traffic still got through.",
        interpret: "Win locked. Try a higher admit next run and see when the cliff returns.",
      };
    }
    return {
      simulate: "The spike won. p95 or success rate broke first.",
      why: result?.takeaway ?? takeaway,
      technologies,
      simulation: result?.reason ?? "Latency or errors escaped the budget.",
      interpret: "Shed earlier at peak (~200 rps). You cannot admit everyone. " + win,
    };
  }, [
    controls.queueCap,
    phase,
    result,
    snap.message,
    snap.p95,
    snap.queue,
    snap.t,
    takeaway,
    technologies,
    win,
  ]);

  return (
    <div className="slo-game">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="drill-kicker">
            Play · Traffic Surge
          </p>
          <h1 className="mt-3 max-w-xl font-serif text-3xl tracking-[-0.02em] md:text-4xl">
            Shape the spike so latency survives.
          </h1>
          <p className="mt-4 max-w-xl text-[0.98rem] leading-relaxed text-[color:var(--drill-muted)]">
            Admit rate and queue caps decide who waits. Keep{" "}
            <DrillTip
              label="p95"
              tip="The 95th-percentile latency: 95% of requests are faster than this number. Budgets usually target a percentile, not the average."
            >
              <span className="underline decoration-dotted decoration-[color:var(--drill-faint)] underline-offset-2">
                p95
              </span>
            </DrillTip>{" "}
            under {P95_LIMIT_MS}ms for {SURGE_DURATION_S}s without starving the floor.
          </p>
        </div>
        <p className="text-[0.78rem] tabular-nums text-[color:var(--drill-muted)]">
          Success <span className="text-[color:var(--drill-fg)]">p95 ≤ {P95_LIMIT_MS}ms</span>
        </p>
      </div>

      <DrillNarrator
        frame={narrateTrafficSurge({
          phase,
          t: snap.t,
          admit: controls.admit,
          queue: snap.queue,
          vipQueue: snap.vipQueue,
          p95: snap.p95,
          p95Limit: P95_LIMIT_MS,
          successRate: snap.successRate,
          shed: snap.shed,
          vipFirst: controls.vipFirst,
        })}
      />
      <DrillTeach lesson={lesson} />

      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <div className="drill-panel p-5 md:p-6 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.72rem] uppercase tracking-[0.18em] text-[color:var(--drill-muted)]">
              {phase === "intro"
                ? "Ready"
                : phase === "running"
                  ? `${snap.t.toFixed(1)}s`
                  : phase === "won"
                    ? "Held"
                    : "Breached"}
            </p>
            <p className="max-w-sm text-right text-sm text-[color:var(--drill-muted)]">{snap.message}</p>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <PlayMeter
              label="Arrivals"
              tip="Incoming request rate. The spike peaks near ~200 rps. that is more than you can admit safely."
              value={snap.arrivals}
              max={240}
              format={(n) => `${n.toFixed(0)} rps`}
              warnAt={0.5}
              dangerAt={0.75}
            />
            <PlayMeter
              label="Queue"
              tip="Requests waiting for service. A long queue turns into p95 latency even when the backend is still working."
              value={snap.queue}
              max={controls.queueCap}
              format={(n) => `${n.toFixed(0)}`}
            />
            <PlayMeter
              label="p95 latency"
              tip="95th-percentile response time. Cross the budget and the drill fails even if the median still looks fine."
              value={snap.p95}
              max={P95_LIMIT_MS}
              format={(n) => `${n.toFixed(0)} ms`}
              warnAt={0.85}
              dangerAt={1}
            />
            <PlayMeter
              label={controls.vipFirst ? "VIP success" : "Success rate"}
              tip={
                controls.vipFirst
                  ? "VIP-priority lane success. Shed the rest first so checkout stays short while overall admit drops."
                  : "Share of requests that complete without being shed or timing out. Shedding spends some success to protect latency."
              }
              value={Math.max(0, 1 - (controls.vipFirst ? snap.vipSuccessRate : snap.successRate))}
              max={0.4}
              format={() =>
                `${((controls.vipFirst ? snap.vipSuccessRate : snap.successRate) * 100).toFixed(0)}%`
              }
              warnAt={0.35}
              dangerAt={0.7}
            />
          </div>
          {phase === "running" ? (
            <p className="mt-4 text-sm text-[color:var(--drill-muted)]">
              Under budget {snap.underBudgetSec.toFixed(1)}s · shed {snap.shed.toFixed(0)}
              {controls.vipFirst ? ` · VIP queue ${snap.vipQueue.toFixed(0)}` : ""}
            </p>
          ) : null}
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
              label="Admit rate"
              tip="Fraction of arrivals allowed into the system. Lower this to shed load before the queue grows."
              value={`${Math.round(controls.admit * 100)}%`}
            />
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
            <DrillControlLabel
              label="Queue cap"
              tip="Maximum waiting requests. Beyond this, new work is shed instead of waiting forever."
              value={controls.queueCap}
            />
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
          <label className="flex items-start gap-3 text-sm text-[color:var(--drill-muted)]">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--cinnabar)]"
              checked={controls.vipFirst}
              onChange={(e) =>
                setControls((c) => ({ ...c, vipFirst: e.target.checked }))
              }
            />
            <span>
              <DrillTip
                label="VIP first"
                tip="When shedding, prefer keeping higher-priority traffic. Protects critical customers while still cutting load."
              >
                <span className="text-[color:var(--drill-fg)]">VIP first when shedding</span>
              </DrillTip>
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
            At peak (~200 rps) you cannot admit everyone. Shed before the queue
            pushes p95 past the budget.
          </p>
        </div>
      </div>
    </div>
  );
}

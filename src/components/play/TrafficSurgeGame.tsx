"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DrillControlLabel, DrillTip } from "@/components/play/DrillTip";
import { DrillNarrator } from "@/components/play/DrillNarrator";
import {
  DrillPanelHeading,
  DrillProseHeader,
  DrillTakeaway,
  type DrillProse,
} from "@/components/play/DrillTeach";
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
  "Calm morning. A spike lands around 12 seconds.",
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
    setSnap(emptySurgeSnap("Spike incoming. Decide admit rate before 12 seconds."));
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
  const takeaway =
    catalog?.takeaway ??
    "Shedding early protects the customers you can serve. Serving everyone slowly serves no one.";

  const prose = useMemo((): DrillProse => {
    if (phase === "won" || phase === "lost") {
      return {
        title: "Traffic Surge",
        challenge: `Can you keep p95 under ${P95_LIMIT_MS} ms through the spike?`,
        situation: <p>{result?.reason ?? snap.message}</p>,
        objective: `Keep p95 under ${P95_LIMIT_MS} ms for most of the ${SURGE_DURATION_S}-second run while still serving most traffic.`,
        explore: technologies,
        gettingStarted:
          phase === "won"
            ? "Try a higher admit rate next run and watch when the cliff returns."
            : "Try again with a lower admit rate before the spike lands.",
        takeaway: result?.takeaway ?? takeaway,
      };
    }
    return {
      title: "Traffic Surge",
      challenge: `Can you keep p95 under ${P95_LIMIT_MS} ms through the spike?`,
      situation: (
        <>
          <p>
            Capacity is fixed for this shift. Around 12 seconds, arrivals jump
            far past what the service can finish in time.
          </p>
          <p>
            You decide who gets in, how long people wait in queue, and whether
            higher-priority traffic is protected when load must be cut.
          </p>
        </>
      ),
      objective: `Keep p95 under ${P95_LIMIT_MS} ms for most of the ${SURGE_DURATION_S}-second run while still serving most of the traffic.`,
      terms: (
        <>
          <DrillTip
            label="p95"
            tip="The 95th-percentile latency: 95% of requests are faster than this number."
          >
            <span className="text-[color:var(--drill-fg)]">p95</span>
          </DrillTip>{" "}
          is the latency budget here: 95% of requests should finish faster than
          this number. A long queue turns wait time into latency even when the
          backend is still working.
        </>
      ),
      explore: technologies,
      gettingStarted:
        "Set admit rate and queue cap before you start. Watch arrivals climb near 12 seconds, then read queue depth and p95 together.",
      takeaway,
    };
  }, [phase, result, snap.message, takeaway, technologies]);

  const statusLabel =
    phase === "intro"
      ? "Ready"
      : phase === "running"
        ? `${snap.t.toFixed(1)}s`
        : phase === "won"
          ? "Held"
          : "Breached";

  return (
    <div className="slo-game">
      <DrillProseHeader prose={prose} compact={phase !== "intro"} />

      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <div className="drill-panel p-5 md:p-6 lg:col-span-7">
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

          <div className="mb-5 [&_.drill-narrator]:mt-0">
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
          </div>

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
                <td>Arrivals</td>
                <td>{snap.arrivals.toFixed(0)} rps</td>
                <td>Incoming request rate. The spike peaks near about 200 rps.</td>
              </tr>
              <tr>
                <td>Queue</td>
                <td>{snap.queue.toFixed(0)}</td>
                <td>Requests waiting for service. A long queue becomes p95 latency.</td>
              </tr>
              <tr>
                <td>p95</td>
                <td>{snap.p95.toFixed(0)} ms</td>
                <td>Hold this under {P95_LIMIT_MS} ms through the spike.</td>
              </tr>
              <tr>
                <td>{controls.vipFirst ? "VIP success" : "Success rate"}</td>
                <td>
                  {(
                    (controls.vipFirst ? snap.vipSuccessRate : snap.successRate) *
                    100
                  ).toFixed(0)}
                  %
                </td>
                <td>
                  Share of requests that complete. Shedding spends some success
                  to protect latency.
                </td>
              </tr>
            </tbody>
          </table>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <PlayMeter
              label="Arrivals"
              tip="Incoming request rate. The spike peaks near ~200 rps."
              value={snap.arrivals}
              max={240}
              format={(n) => `${n.toFixed(0)} rps`}
              warnAt={0.5}
              dangerAt={0.75}
            />
            <PlayMeter
              label="Queue"
              tip="Requests waiting for service. A long queue turns into p95 latency."
              value={snap.queue}
              max={controls.queueCap}
              format={(n) => `${n.toFixed(0)}`}
            />
            <PlayMeter
              label="p95 latency"
              tip="95th-percentile response time. Cross the budget and the drill fails."
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
                  ? "VIP-priority lane success."
                  : "Share of requests that complete without being shed or timing out."
              }
              value={Math.max(
                0,
                1 - (controls.vipFirst ? snap.vipSuccessRate : snap.successRate),
              )}
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
          <DrillPanelHeading>Adjust your settings</DrillPanelHeading>

          <label className="block">
            <DrillControlLabel
              label="Admit rate"
              tip="Fraction of arrivals allowed into the system."
              help="Fraction of arrivals allowed in. Lower this to shed load before the queue grows past what you can finish."
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
              tip="Maximum waiting requests."
              help="Maximum waiting requests. Beyond this, new work is shed instead of waiting forever."
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
              className="mt-1 size-4 accent-[var(--cinnabar)]"
              checked={controls.vipFirst}
              onChange={(e) =>
                setControls((c) => ({ ...c, vipFirst: e.target.checked }))
              }
            />
            <span>
              <span className="font-medium text-[color:var(--drill-fg)]">
                VIP first when shedding
              </span>
              <span className="mt-1.5 block leading-relaxed">
                When load must be cut, prefer keeping higher-priority traffic.
                This protects critical customers while still reducing pressure.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 text-sm text-[color:var(--drill-muted)]">
            <input
              type="checkbox"
              className="mt-1 size-4 accent-[var(--cinnabar)]"
              checked={stepMode}
              onChange={(e) => setStepOverride(e.target.checked)}
              disabled={phase === "running"}
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

          <DrillTakeaway>{takeaway}</DrillTakeaway>
        </div>
      </div>
    </div>
  );
}

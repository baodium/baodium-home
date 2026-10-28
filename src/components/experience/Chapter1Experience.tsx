"use client";

import Link from "next/link";
import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CODE_LINES,
  createEngine,
  injectSingleRequest,
  setControls,
  snapshot,
  stepOnce,
  tick,
  type Engine,
} from "@/lib/experience/engine";
import type { SimRequest } from "@/lib/experience/types";
import {
  clearProgress,
  saveProgress,
  type Chapter1Progress,
} from "@/lib/experience/progress";
import { chapter1Scenario } from "@/lib/experience/scenarios/chapter-1";
import type {
  DecisionKind,
  EngineSnapshot,
  GuidedStepId,
} from "@/lib/experience/types";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";
import { CodePanel } from "@/components/experience/CodePanel";
import { ConnectionPoolGrid } from "@/components/experience/ConnectionPoolGrid";
import { FeatureFlagPanel } from "@/components/experience/FeatureFlagPanel";
import { GuidedProgress } from "@/components/experience/GuidedProgress";
import { LittlesLawCallout } from "@/components/experience/LittlesLawCallout";
import { MetricsStrip } from "@/components/experience/MetricsStrip";
import { MitigationControls } from "@/components/experience/MitigationControls";
import { OpsMetricsPanel } from "@/components/experience/OpsMetricsPanel";
import { PredictionOutcome } from "@/components/experience/PredictionOutcome";
import { ProductPreview } from "@/components/experience/ProductPreview";
import { RequestPath } from "@/components/experience/RequestPath";
import { RequestTrace } from "@/components/experience/RequestTrace";
import { SimControls } from "@/components/experience/SimControls";
import { TeachingOverlay } from "@/components/experience/TeachingOverlay";
import { TrainingBrief } from "@/components/experience/TrainingBrief";
import { selectPedagogyLesson } from "@/lib/experience/pedagogy";
import { narrateChapter1 } from "@/lib/experience/narrator";

const STEP_ORDER = chapter1Scenario.steps.map((s) => s.id);
const ease = [0.22, 1, 0.36, 1] as const;

function emptySnap(): EngineSnapshot {
  return snapshot(createEngine(42, { arrivalRate: 0, featureEnabled: false, exposurePct: 0 }));
}

function fillDebrief(kind: DecisionKind, snap: EngineSnapshot): string {
  const tpl = chapter1Scenario.debriefTemplates[kind];
  const waiterOutcome =
    snap.waitingCount === 0
      ? "cleared as demand fell under 40"
      : snap.waitingCount > 0
        ? `remained at ${snap.waitingCount} while demand stayed elevated`
        : "shifted with traffic";
  return tpl
    .replace("{exposure}", String(snap.controls.exposurePct))
    .replace("{waiterOutcome}", waiterOutcome);
}

export function Chapter1Experience() {
  const reduced = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: rootRef,
    offset: ["start start", "end start"],
  });
  const atmosphereY = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [0, 48]);
  const atmosphereOpacity = useTransform(
    scrollYProgress,
    [0, 0.6],
    reduced ? [1, 1] : [0.85, 0.35],
  );
  const scenario = chapter1Scenario;
  const engineRef = useRef<Engine>(
    createEngine(42, { arrivalRate: 0, featureEnabled: false, exposurePct: 0 }),
  );
  const [snap, setSnap] = useState<EngineSnapshot>(emptySnap);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [stepId, setStepId] = useState<GuidedStepId>("inspect");
  const [showRecs, setShowRecs] = useState(false);
  const [previewToggled, setPreviewToggled] = useState(false);
  const [deployedZero, setDeployedZero] = useState(false);
  const [traced, setTraced] = useState(false);
  const [sawWaiters, setSawWaiters] = useState(false);
  const [decision, setDecision] = useState<DecisionKind | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [predictionAnswered, setPredictionAnswered] = useState(false);
  const [mode, setMode] = useState<"guided" | "sandbox">("guided");
  const [actionLog, setActionLog] = useState<string[]>([]);
  const [replaySeed, setReplaySeed] = useState(42);
  const [focusedReq, setFocusedReq] = useState<SimRequest | null>(null);
  const rafRef = useRef<number | null>(null);

  const stepDef = scenario.steps.find((s) => s.id === stepId)!;
  const stepIndex = STEP_ORDER.indexOf(stepId);

  const sync = useCallback(() => {
    const s = snapshot(engineRef.current);
    setSnap(s);
    if (s.waitingCount > 0) setSawWaiters(true);
    const focusId = engineRef.current.tracedId;
    if (focusId) {
      setSelectedId(focusId);
      const live =
        s.active.find((r) => r.id === focusId) ??
        s.waiting.find((r) => r.id === focusId) ??
        s.tracedRequest;
      if (live) setFocusedReq({ ...live });
    }
  }, []);

  useEffect(() => {
    const patch: Partial<Chapter1Progress> = {
      stepId,
      decision,
      previewToggled,
      deployedZero,
      completed: mode === "sandbox" || stepId === "sandbox",
    };
    saveProgress(patch);
  }, [stepId, decision, previewToggled, deployedZero, mode]);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      window.clearInterval(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => {
    stopLoop();
    if (!running) return;
    rafRef.current = window.setInterval(() => {
      // ~50ms wall ≈ 5 fine ticks at 1× so 12ms baseline holds resolve credibly.
      const steps = Math.max(1, Math.round(5 * speed));
      for (let i = 0; i < steps; i++) tick(engineRef.current, 0.01);
      sync();
    }, 50);
    return stopLoop;
  }, [running, speed, stopLoop, sync]);

  const logAction = (msg: string) => {
    setActionLog((prev) => [`t=${engineRef.current.t.toFixed(1)}s. ${msg}`, ...prev].slice(0, 24));
  };

  const onTogglePreview = () => {
    setShowRecs((v) => !v);
    setPreviewToggled(true);
    logAction("Toggled product page preview");
  };

  const onDeployZero = () => {
    setControls(engineRef.current, {
      featureEnabled: true,
      exposurePct: 0,
      featureDisabledForNew: false,
      arrivalRate: 40,
    });
    setDeployedZero(true);
    setRunning(true);
    sync();
    logAction("Deployed with flag ON at 0% exposure");
  };

  const onTrace = () => {
    setControls(engineRef.current, {
      featureEnabled: true,
      exposurePct: Math.max(engineRef.current.controls.exposurePct, 100),
      arrivalRate: engineRef.current.controls.arrivalRate || 20,
    });
    const req = injectSingleRequest(engineRef.current, { forceExposed: true });
    setTraced(true);
    setSelectedId(req.id);
    setRunning(true);
    sync();
    logAction(`Traced request ${req.id}`);
  };

  const onExposure = (pct: number) => {
    setControls(engineRef.current, {
      exposurePct: pct,
      featureEnabled: true,
      featureDisabledForNew: false,
    });
    if (pct >= 5 && engineRef.current.controls.arrivalRate < 60) {
      setControls(engineRef.current, { arrivalRate: 80 }, false);
    }
    engineRef.current.arrivalMultiplier = 1;
    setRunning(true);
    sync();
    logAction(`Exposure → ${pct}%`);
  };

  const startPressure = () => {
    // λ×W must exceed 40 so waiters appear (never fake busy > 40).
    // 550 × (0.012 + 0.09) ≈ 56 demand → ~40 busy + waiters.
    setControls(engineRef.current, {
      featureEnabled: true,
      featureDisabledForNew: false,
      exposurePct: 100,
      arrivalRate: 550,
      recLookupSec: 0.09,
      paused: false,
    });
    engineRef.current.arrivalMultiplier = 1;
    setRunning(true);
    sync();
    logAction("Pressure: ~550 req/s, full exposure, ~90ms rec holds");
  };

  const applyDecision = (kind: DecisionKind) => {
    setDecision(kind);
    if (kind === "pause_exposure") {
      logAction(`Decision: pause exposure at ${engineRef.current.controls.exposurePct}% (traffic continues; cohort frozen)`);
      // Freeze exposure only. do not secretly cut λ (that taught the wrong lesson).
      setControls(engineRef.current, { paused: true });
    } else if (kind === "disable_feature") {
      setControls(engineRef.current, {
        featureDisabledForNew: true,
        featureEnabled: false,
        exposurePct: 0,
      });
      logAction("Decision: disable feature for new traffic");
    } else {
      logAction("Decision: investigate. Left traffic running");
    }
    sync();
  };

  const canContinue = useMemo(() => {
    switch (stepDef.require) {
      case "toggle_preview":
        return previewToggled || showRecs;
      case "deploy_zero":
        return deployedZero || snap.controls.featureEnabled;
      case "trace_request":
        return traced || snap.completedCount > 0 || focusedReq !== null;
      case "exposure_5":
        return snap.controls.exposurePct >= 5;
      case "exposure_25":
        return snap.controls.exposurePct >= 25 && (predictionAnswered || !stepDef.prediction);
      case "see_waiters":
        return sawWaiters && (predictionAnswered || !stepDef.prediction);
      case "decision":
        return decision !== null;
      default:
        return true;
    }
  }, [
    stepDef.require,
    stepDef.prediction,
    previewToggled,
    showRecs,
    deployedZero,
    snap.controls.featureEnabled,
    traced,
    snap.completedCount,
    focusedReq,
    snap.controls.exposurePct,
    predictionAnswered,
    sawWaiters,
    decision,
  ]);

  const goNext = () => {
    const next = STEP_ORDER[stepIndex + 1];
    if (!next) return;
    if (next === "inspect_prod") {
      setControls(engineRef.current, {
        arrivalRate: 80,
        exposurePct: Math.max(25, engineRef.current.controls.exposurePct),
        featureEnabled: true,
      });
      setRunning(true);
    }
    if (next === "pressure") {
      setPredictionAnswered(false);
      startPressure();
    }
    if (next === "rollout") setPredictionAnswered(false);
    if (next === "sandbox") {
      setMode("sandbox");
      setControls(engineRef.current, {
        arrivalRate: 100,
        exposurePct: 25,
        featureEnabled: true,
        featureDisabledForNew: false,
        recLookupSec: 0.07,
        paused: false,
      });
      setRunning(true);
    }
    setStepId(next);
    sync();
  };

  const enterSandbox = () => {
    setMode("sandbox");
    setStepId("sandbox");
    setControls(engineRef.current, {
      arrivalRate: 100,
      exposurePct: 25,
      featureEnabled: true,
      featureDisabledForNew: false,
      recLookupSec: 0.07,
      paused: false,
    });
    setRunning(true);
    sync();
  };

  const onReplay = () => {
    stopLoop();
    setRunning(false);
    const nextSeed = replaySeed + 17;
    setReplaySeed(nextSeed);
    engineRef.current = createEngine(nextSeed, {
      arrivalRate: mode === "sandbox" ? 100 : 0,
      featureEnabled: mode === "sandbox",
      exposurePct: mode === "sandbox" ? 25 : 0,
    });
    setSelectedId(null);
    setFocusedReq(null);
    setTraced(false);
    setSawWaiters(false);
    logAction("Replay. Engine reset");
    sync();
  };

  const onFullReset = () => {
    clearProgress();
    stopLoop();
    setRunning(false);
    engineRef.current = createEngine(42, {
      arrivalRate: 0,
      featureEnabled: false,
      exposurePct: 0,
    });
    setStepId("inspect");
    setMode("guided");
    setShowRecs(false);
    setPreviewToggled(false);
    setDeployedZero(false);
    setTraced(false);
    setSawWaiters(false);
    setDecision(null);
    setSelectedId(null);
    setPredictionAnswered(false);
    setActionLog([]);
    setSnap(snapshot(engineRef.current));
  };

  const tracedReq = focusedReq;
  const highlight =
    tracedReq && (tracedReq.phase === "holding" || tracedReq.phase === "waiting")
      ? tracedReq.codeLine
      : tracedReq?.phase === "done"
        ? CODE_LINES.respond
        : showRecs
          ? 7
          : 3;

  const debriefText = decision ? fillDebrief(decision, snap) : null;
  const liveFrame = useMemo(() => narrateChapter1(snap), [snap]);
  const lesson = useMemo(
    () => selectPedagogyLesson(snap, stepId, mode),
    [snap, stepId, mode],
  );

  const selectRequest = (id: string | null) => {
    setSelectedId(id);
    engineRef.current.tracedId = id;
    if (!id) {
      setFocusedReq(null);
      return;
    }
    const s = snapshot(engineRef.current);
    const live =
      s.active.find((r) => r.id === id) ??
      s.waiting.find((r) => r.id === id) ??
      s.tracedRequest;
    setFocusedReq(live ? { ...live } : null);
  };

  const showProduct =
    stepId === "inspect" || stepId === "review" || mode === "sandbox";
  const showPool =
    mode === "sandbox" ||
    ["trace", "rollout", "inspect_prod", "pressure", "decide", "debrief"].includes(stepId) ||
    snap.activeCount > 0 ||
    snap.waitingCount > 0;
  const showFlag =
    mode === "sandbox" ||
    ["review", "trace", "rollout", "inspect_prod", "pressure", "decide", "debrief"].includes(
      stepId,
    ) ||
    snap.controls.featureEnabled;
  const showMetrics =
    mode === "sandbox" ||
    ["rollout", "inspect_prod", "pressure", "decide", "debrief"].includes(stepId) ||
    snap.completedCount > 8;
  const showOps =
    mode === "sandbox" ||
    ["inspect_prod", "pressure", "decide", "debrief"].includes(stepId) ||
    snap.waitingCount > 0 ||
    snap.timeoutCount > 0 ||
    snap.slo.breached;
  const showMitigations = mode === "sandbox" || stepId === "decide" || stepId === "debrief";
  const showTrace =
    mode === "sandbox" ||
    ["trace", "rollout", "inspect_prod", "pressure", "decide", "debrief"].includes(stepId) ||
    focusedReq !== null;

  const applyMitigation = (patch: {
    acquireTimeoutSec?: number | null;
    shedAtUtil?: number | null;
    cacheHitRate?: number;
  }) => {
    setControls(engineRef.current, patch);
    setRunning(true);
    sync();
    const bits: string[] = [];
    if (patch.acquireTimeoutSec !== undefined) {
      bits.push(
        patch.acquireTimeoutSec === null
          ? "timeout off"
          : `timeout ${(patch.acquireTimeoutSec * 1000).toFixed(0)}ms`,
      );
    }
    if (patch.shedAtUtil !== undefined) {
      bits.push(
        patch.shedAtUtil === null
          ? "shed off"
          : `shed@${Math.round(patch.shedAtUtil * 100)}%`,
      );
    }
    if (patch.cacheHitRate !== undefined) {
      bits.push(`cache ${Math.round(patch.cacheHitRate * 100)}%`);
    }
    logAction(`Mitigation: ${bits.join(" · ")}`);
  };

  return (
    <div ref={rootRef} className="relative mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      {!reduced ? (
        <motion.div
          aria-hidden="true"
          style={{ y: atmosphereY, opacity: atmosphereOpacity }}
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[#eef3f7]/80"
        />
      ) : null}
      <header className="relative max-w-3xl">
        <motion.p
          className="exp-kicker"
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.45, ease }}
        >
          Chapter {scenario.meta.number} · ~{scenario.meta.durationMin} min · Guided + sandbox
        </motion.p>
        <motion.h1
          className="mt-2 font-serif text-[clamp(1.95rem,4.2vw,2.9rem)] leading-[1.05] tracking-[-0.03em] text-[color:var(--exp-fg)]"
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.6, delay: reduced ? 0 : 0.05, ease }}
        >
          {scenario.meta.title}
        </motion.h1>
        {scenario.meta.subtitle ? (
          <motion.p
            className="mt-2 font-serif text-[1.05rem] italic leading-snug text-[color:var(--exp-amber)] sm:text-[1.12rem]"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : 0.08, ease }}
          >
            {scenario.meta.subtitle}
          </motion.p>
        ) : null}
        <motion.p
          className="mt-3 text-base leading-relaxed text-[color:var(--exp-muted)] sm:text-lg"
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.55, delay: reduced ? 0 : 0.1, ease }}
        >
          {scenario.brief}
        </motion.p>
        {!reduced ? (
          <motion.div
            aria-hidden="true"
            initial={{ scaleX: 0.08, opacity: 0.2 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.2, ease }}
            className="mt-6 h-px origin-left bg-[color-mix(in_srgb,var(--exp-accent)_45%,transparent)]"
          />
        ) : (
          <div
            aria-hidden="true"
            className="mt-6 h-px bg-[color-mix(in_srgb,var(--exp-accent)_45%,transparent)]"
          />
        )}
      </header>

      <TrainingBrief
        simulate="Recommendations behind a feature flag share a 40-slot database connection pool with the rest of the product page path."
        why="Correct code can still exhaust a shared resource. Waiting, timeouts, and SLO burn show up before anyone finds a bug in the query."
        technologies={[
          "Feature flags",
          "Connection pools",
          "Little’s Law",
          "Acquire timeout",
          "Load shedding",
          "Request-path cache",
        ]}
        simulation="Guided walkthrough first: inspect, deploy at 0%, trace one request, raise exposure, pressure the pool, then decide. Sandbox unlocks the same levers for free practice."
        interpret="Read pool.active, pool.pending, acquire.wait.p99, and path latency. Busy stays ≤ 40; overflow waits. Disable cuts new demand while in-flight holds drain."
      />

      <div className="mt-6 space-y-4">
        <GuidedProgress
          steps={scenario.steps.map((s) => ({ id: s.id, title: s.title }))}
          stepId={stepId}
          mode={mode}
        />

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-full border border-[color:var(--exp-line)] bg-[color:var(--exp-panel)] p-1">
            <button
              type="button"
              onClick={() => {
                setMode("guided");
                if (stepId === "sandbox") setStepId(decision ? "debrief" : "inspect");
              }}
              className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                mode === "guided"
                  ? "bg-[color:var(--exp-fg)] text-white"
                  : "text-[color:var(--exp-muted)] hover:text-[color:var(--exp-fg)]"
              }`}
            >
              Guided
            </button>
            <button
              type="button"
              onClick={enterSandbox}
              className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                mode === "sandbox"
                  ? "bg-[color:var(--exp-fg)] text-white"
                  : "text-[color:var(--exp-muted)] hover:text-[color:var(--exp-fg)]"
              }`}
            >
              Sandbox
            </button>
          </div>
          <SimControls
            running={running}
            speed={speed}
            onPlayPause={() => setRunning((r) => !r)}
            onStep={() => {
              stepOnce(engineRef.current);
              sync();
            }}
            onReplay={onReplay}
            onSpeed={setSpeed}
            reducedMotion={reduced}
          />
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.4fr)]">
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <TeachingOverlay
            lesson={lesson}
            live={liveFrame}
            reducedMotion={reduced}
            compactTry={mode === "guided"}
          />

          <AnimatePresence mode="wait">
            {mode === "guided" ? (
              <motion.div
                key={`guided-${stepId}`}
                className="exp-panel border-[color-mix(in_srgb,var(--exp-accent)_28%,transparent)]"
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: reduced ? 0 : 0.35, ease }}
              >
                <p className="exp-kicker">
                  Step {stepIndex + 1} of {STEP_ORDER.length}
                </p>
                <h2 className="mt-2 font-serif text-xl text-[color:var(--exp-fg)]">
                  {stepDef.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--exp-muted)]">
                  {stepDef.body}
                </p>

                {stepDef.prediction && !predictionAnswered ? (
                  <div className="mt-4 rounded-xl border border-[color:var(--exp-line)] bg-[color-mix(in_srgb,#fff_55%,transparent)] p-3">
                    <p className="text-sm text-[color:var(--exp-fg)]">{stepDef.prediction}</p>
                    <button
                      type="button"
                      className="exp-btn exp-btn-ghost mt-3"
                      onClick={() => setPredictionAnswered(true)}
                    >
                      I have made my prediction. Show me
                    </button>
                  </div>
                ) : null}

                {stepDef.prediction && predictionAnswered && stepId === "rollout" ? (
                  <PredictionOutcome
                    snap={snap}
                    answered={predictionAnswered}
                    reducedMotion={reduced}
                  />
                ) : null}

                {stepDef.prediction && predictionAnswered && stepId === "pressure" ? (
                  <p className="mt-3 rounded-xl border border-[color:var(--exp-line)] bg-[color-mix(in_srgb,#fff_55%,transparent)] px-3 py-2.5 text-sm leading-relaxed text-[color:var(--exp-muted)]">
                    <span className="text-[color:var(--exp-fg)]">Expected answer: </span>
                    Disable stops <em>new</em> recommendation acquires; in-flight busy slots keep
                    their connections until release. pool.pending drains as those holds finish . 
                    disable ≠ kill.
                  </p>
                ) : null}

                {stepId === "inspect" ? (
                  <button type="button" onClick={onTogglePreview} className="exp-btn exp-btn-primary mt-4">
                    Toggle page preview
                  </button>
                ) : null}

                {stepId === "review" ? (
                  <button type="button" onClick={onDeployZero} className="exp-btn exp-btn-primary mt-4">
                    Deploy at 0% exposure
                  </button>
                ) : null}

                {stepId === "trace" ? (
                  <button type="button" onClick={onTrace} className="exp-btn exp-btn-primary mt-4">
                    Send one request
                  </button>
                ) : null}

                {stepId === "rollout" ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => onExposure(5)} className="exp-btn exp-btn-ghost">
                      Set 5%
                    </button>
                    <button
                      type="button"
                      disabled={!predictionAnswered && stepDef.prediction !== undefined}
                      onClick={() => {
                        setPredictionAnswered(true);
                        onExposure(25);
                      }}
                      className="exp-btn exp-btn-primary"
                    >
                      Set 25%
                    </button>
                  </div>
                ) : null}

                {stepId === "pressure" ? (
                  <button type="button" onClick={startPressure} className="exp-btn exp-btn-primary mt-4">
                    Surge traffic
                  </button>
                ) : null}

                {stepId === "decide" ? (
                  <div className="mt-4 flex flex-col gap-2">
                    {(
                      [
                        ["pause_exposure", "Pause exposure"],
                        ["disable_feature", "Disable feature"],
                        ["investigate", "Keep investigating"],
                      ] as const
                    ).map(([k, label]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => applyDecision(k)}
                        className={`exp-btn w-full justify-start ${
                          decision === k ? "exp-btn-primary" : "exp-btn-ghost"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                ) : null}

                {stepId === "debrief" && debriefText ? (
                  <div className="mt-4 space-y-3 text-sm leading-relaxed text-[color:var(--exp-muted)]">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-[color:var(--exp-line)] bg-[color:var(--exp-panel)] px-3 py-2.5">
                        <p className="exp-kicker !tracking-[0.16em]">Before</p>
                        <p className="mt-1.5 text-[color:var(--exp-fg)]">
                          Exposed traffic held the 40-slot pool longer (~12ms → ~80ms). Arrivals kept
                          coming; waiters grew while busy stayed capped at 40.
                        </p>
                      </div>
                      <div className="rounded-xl border border-[color:var(--exp-line)] bg-[color:var(--exp-panel)] px-3 py-2.5">
                        <p className="exp-kicker !tracking-[0.16em]">After your choice</p>
                        <p className="mt-1.5 text-[color:var(--exp-fg)]">{debriefText}</p>
                      </div>
                      <div className="rounded-xl border border-[color-mix(in_srgb,var(--exp-signal)_35%,transparent)] bg-[color-mix(in_srgb,var(--exp-signal)_6%,var(--exp-panel))] px-3 py-2.5">
                        <p className="exp-kicker !tracking-[0.16em] !text-[color:var(--exp-signal)]">
                          Takeaway
                        </p>
                        <p className="mt-1.5 text-[color:var(--exp-fg)]">
                          Correct code still waits on a shared finite pool. Disable cuts new demand;
                          in-flight holds drain on their own. Cache cuts W; shed/timeout trade errors
                          for headroom. same ops signature you would page on.
                        </p>
                      </div>
                    </div>
                    <ul className="mt-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {(
                        [
                          ["Util", `${(snap.utilization * 100).toFixed(0)}%`],
                          ["Pending", `${snap.waitingCount}`],
                          [
                            "Acquire p99",
                            `${(snap.acquireWaitP99 * 1000).toFixed(0)} ms`,
                          ],
                          ["Timeouts", `${snap.timeoutCount}`],
                        ] as const
                      ).map(([label, value]) => (
                        <li
                          key={label}
                          className="flex items-baseline justify-between gap-2 rounded-lg border border-[color:var(--exp-line)] bg-[color:var(--exp-panel)] px-3 py-2"
                        >
                          <span className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
                            {label}
                          </span>
                          <span className="tabular-nums text-[color:var(--exp-fg)]">{value}</span>
                        </li>
                      ))}
                    </ul>
                    {actionLog.length > 0 ? (
                      <div>
                        <p className="exp-kicker !tracking-[0.16em]">Your timeline</p>
                        <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-[color:var(--exp-faint)]">
                          {actionLog.map((a) => (
                            <li key={a}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {stepId !== "sandbox" ? (
                  <button
                    type="button"
                    disabled={!canContinue}
                    onClick={goNext}
                    className="exp-btn exp-btn-solid mt-5 w-full sm:w-auto"
                  >
                    {stepId === "debrief" ? "Enter sandbox" : "Continue"}
                  </button>
                ) : null}
              </motion.div>
            ) : (
              <motion.div
                key="sandbox"
                className="exp-panel"
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduced ? 0 : 0.35, ease }}
              >
                <h2 className="font-serif text-xl text-[color:var(--exp-fg)]">Sandbox</h2>
                <p className="mt-2 text-sm text-[color:var(--exp-muted)]">
                  Pressure the pool, then operate: disable, shed, timeout, or cache. Read Ops like
                  an on-call dashboard. Same rules as guided mode.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    data-testid="demo-pressure"
                    onClick={() => {
                      startPressure();
                      logAction("Sandbox demo pressure preset");
                    }}
                    className="exp-btn exp-btn-primary"
                  >
                    Demo pressure
                  </button>
                  <button
                    type="button"
                    data-testid="demo-shed"
                    onClick={() => {
                      startPressure();
                      applyMitigation({ shedAtUtil: 0.85 });
                      logAction("Sandbox shed@85% under pressure");
                    }}
                    className="exp-btn exp-btn-ghost"
                  >
                    Pressure + shed
                  </button>
                  <button
                    type="button"
                    data-testid="demo-timeout"
                    onClick={() => {
                      startPressure();
                      applyMitigation({ acquireTimeoutSec: 0.1 });
                      logAction("Sandbox timeout 100ms under pressure");
                    }}
                    className="exp-btn exp-btn-ghost"
                  >
                    Pressure + timeout
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      applyDecision("disable_feature");
                      setRunning(true);
                    }}
                    className="exp-btn exp-btn-ghost"
                  >
                    Disable new traffic
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setControls(engineRef.current, {
                        arrivalRate: 80,
                        exposurePct: 25,
                        featureEnabled: true,
                        featureDisabledForNew: false,
                        recLookupSec: 0.07,
                        paused: false,
                        acquireTimeoutSec: null,
                        shedAtUtil: null,
                        cacheHitRate: 0,
                      });
                      setRunning(true);
                      sync();
                      logAction("Sandbox calm preset");
                    }}
                    className="exp-btn exp-btn-ghost"
                  >
                    Calm 25%
                  </button>
                </div>

                <label className="mt-5 block text-sm text-[color:var(--exp-muted)]">
                  Arrival rate:{" "}
                  <span className="font-mono tabular-nums text-[color:var(--exp-fg)]">
                    {snap.controls.arrivalRate}
                  </span>{" "}
                  req/s
                  <input
                    type="range"
                    min={20}
                    max={600}
                    step={10}
                    value={snap.controls.arrivalRate}
                    onChange={(e) => {
                      setControls(
                        engineRef.current,
                        { arrivalRate: Number(e.target.value) },
                        false,
                      );
                      setRunning(true);
                      sync();
                    }}
                    className="mt-2 w-full accent-[color:var(--exp-accent)]"
                  />
                </label>
                <label className="mt-3 block text-sm text-[color:var(--exp-muted)]">
                  Rec lookup:{" "}
                  <span className="font-mono tabular-nums text-[color:var(--exp-fg)]">
                    {(snap.controls.recLookupSec * 1000).toFixed(0)}
                  </span>{" "}
                  ms
                  <input
                    type="range"
                    min={20}
                    max={200}
                    step={5}
                    value={Math.round(snap.controls.recLookupSec * 1000)}
                    onChange={(e) => {
                      setControls(
                        engineRef.current,
                        { recLookupSec: Number(e.target.value) / 1000 },
                        false,
                      );
                      sync();
                    }}
                    className="mt-2 w-full accent-[color:var(--exp-accent)]"
                  />
                </label>
                <label className="mt-3 block text-sm text-[color:var(--exp-muted)]">
                  Exposure:{" "}
                  <span className="font-mono tabular-nums text-[color:var(--exp-fg)]">
                    {snap.controls.exposurePct}%
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={snap.controls.exposurePct}
                    disabled={
                      !snap.controls.featureEnabled || snap.controls.featureDisabledForNew
                    }
                    onChange={(e) => onExposure(Number(e.target.value))}
                    className="mt-2 w-full accent-[color:var(--exp-accent)] disabled:opacity-40"
                  />
                </label>

                <Link
                  href={scenario.meta.bookHref}
                  className="mt-4 inline-flex text-sm text-[color:var(--exp-amber)] underline-offset-4 hover:underline"
                >
                  Read Chapter 1 in the book →
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="exp-panel-flat">
            <p className="exp-kicker !tracking-[0.16em]">Assumptions</p>
            <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-[color:var(--exp-muted)]">
              {scenario.assumptions.map((a) => (
                <li key={a}>· {a}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={onFullReset}
              className="mt-3 text-xs text-[color:var(--exp-faint)] underline-offset-2 hover:text-[color:var(--exp-muted)] hover:underline"
            >
              Reset guided progress
            </button>
          </div>
        </aside>

        <div className="space-y-4">
          <RequestPath snap={snap} reducedMotion={reduced} />
          {showProduct ? (
            <ProductPreview showRecs={showRecs} onToggle={onTogglePreview} />
          ) : null}
          <CodePanel lines={scenario.codeLines} highlightLine={highlight} />
          {showFlag ? (
            <FeatureFlagPanel
              snap={snap}
              onToggleFeature={(on) => {
                setControls(engineRef.current, {
                  featureEnabled: on,
                  featureDisabledForNew: on
                    ? false
                    : engineRef.current.controls.featureDisabledForNew,
                });
                setRunning(true);
                sync();
                logAction(`Flag ${on ? "ON" : "OFF"}`);
              }}
              onExposure={onExposure}
              onDisableNew={() => applyDecision("disable_feature")}
            />
          ) : null}
          {showPool ? (
            <ConnectionPoolGrid
              snap={snap}
              selectedId={selectedId}
              onSelect={selectRequest}
              reducedMotion={reduced}
            />
          ) : null}
          {showMetrics ? (
            <div className="grid gap-4 md:grid-cols-2">
              <LittlesLawCallout snap={snap} reducedMotion={reduced} />
              <MetricsStrip snap={snap} reducedMotion={reduced} />
            </div>
          ) : null}
          {showOps ? (
            <OpsMetricsPanel snap={snap} reducedMotion={reduced} />
          ) : null}
          {showMitigations ? (
            <MitigationControls
              snap={snap}
              onChange={applyMitigation}
              reducedMotion={reduced}
            />
          ) : null}
          {showTrace ? (
            <RequestTrace req={tracedReq} now={snap.t} reducedMotion={reduced} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

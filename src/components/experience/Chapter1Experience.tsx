"use client";

import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CHAPTER1_SOURCE } from "@/lib/experience/chapter1-program";
import {
  applyChapter1Source,
  createEngine,
  injectSingleRequest,
  setControls,
  setSimFrozen,
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
import { markChapterFinished, markChapterOpened } from "@/lib/learning/directory-progress";
import type {
  DecisionKind,
  EngineSnapshot,
  GuidedStepId,
  LabMode,
} from "@/lib/experience/types";
import {
  challengeStatusCopy,
  evaluateChallenge,
  type ChallengeStatus,
} from "@/lib/experience/challenge";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";
import { ChapterPlate } from "@/components/learning/ChapterPlate";
import { CodePanel } from "@/components/experience/CodePanel";
import { chapter1Call } from "@/lib/experience/running-code";
import { ConnectionPoolGrid } from "@/components/experience/ConnectionPoolGrid";
import { FeatureFlagPanel } from "@/components/experience/FeatureFlagPanel";
import { GuidedProgress } from "@/components/experience/GuidedProgress";
import { LabIntro } from "@/components/experience/LabIntro";
import { LittlesLawCallout } from "@/components/experience/LittlesLawCallout";
import { LatencyBreakdownChart } from "@/components/experience/LatencyBreakdownChart";
import { MetricsStrip } from "@/components/experience/MetricsStrip";
import { MitigationControls } from "@/components/experience/MitigationControls";
import { OpsMetricsPanel } from "@/components/experience/OpsMetricsPanel";
import { PredictionOutcome } from "@/components/experience/PredictionOutcome";
import { ProductPreview } from "@/components/experience/ProductPreview";
import { RequestPath } from "@/components/experience/RequestPath";
import { RequestTrace } from "@/components/experience/RequestTrace";
import { SimControls } from "@/components/experience/SimControls";
import { TeachingOverlay } from "@/components/experience/TeachingOverlay";
import { Segmented } from "@/components/ui/Segmented";
import { selectPedagogyLesson } from "@/lib/experience/pedagogy";
import { narrateChapter1 } from "@/lib/experience/narrator";
import { LearningWorkbench } from "@/components/learning/LearningWorkbench";
import { CH1_GUIDED_STAGE_COUNT } from "@/lib/learning/registry";

const STEP_ORDER = chapter1Scenario.steps.map((s) => s.id);
const ease = [0.22, 1, 0.36, 1] as const;

function emptySnap(): EngineSnapshot {
  return snapshot(
    createEngine(42, { arrivalRate: 0, featureEnabled: false, exposurePct: 0 }),
  );
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

function isOpenMode(mode: LabMode) {
  return mode === "practice" || mode === "challenge";
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
  const [source, setSource] = useState(CHAPTER1_SOURCE);
  const sourceRef = useRef(CHAPTER1_SOURCE);
  const [previewToggled, setPreviewToggled] = useState(false);
  const [deployedZero, setDeployedZero] = useState(false);
  const [traced, setTraced] = useState(false);
  const [sawWaiters, setSawWaiters] = useState(false);
  const [decision, setDecision] = useState<DecisionKind | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [predictionAnswered, setPredictionAnswered] = useState(false);
  const [mode, setMode] = useState<LabMode>("guided");
  const [actionLog, setActionLog] = useState<string[]>([]);
  const [replaySeed, setReplaySeed] = useState(42);
  const [focusedReq, setFocusedReq] = useState<SimRequest | null>(null);
  const [challengeStartT, setChallengeStartT] = useState(0);
  const [challengeStatus, setChallengeStatus] = useState<ChallengeStatus>("idle");
  const rafRef = useRef<number | null>(null);

  const stepDef = scenario.steps.find((s) => s.id === stepId)!;
  const stepIndex = STEP_ORDER.indexOf(stepId);
  const guidedCount = STEP_ORDER.length;

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
    markChapterOpened("chapter-1");
  }, []);

  useEffect(() => {
    if (stepId === "review" || challengeStatus === "passed") markChapterFinished("chapter-1");
  }, [stepId, challengeStatus]);

  useEffect(() => {
    const patch: Partial<Chapter1Progress> = {
      stepId,
      decision,
      previewToggled,
      deployedZero,
      mode,
      completed: isOpenMode(mode) || stepId === "review",
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
    const frameMs = 200;
    rafRef.current = window.setInterval(() => {
      const steps = Math.max(1, Math.round((frameMs / 10) * speed));
      for (let i = 0; i < steps; i++) tick(engineRef.current, 0.01);
      sync();
    }, frameMs);
    return stopLoop;
  }, [running, speed, stopLoop, sync]);

  useEffect(() => {
    if (mode !== "challenge" || challengeStatus === "idle") return;
    if (challengeStatus === "passed" || challengeStatus === "failed") return;
    const next = evaluateChallenge(
      snap,
      scenario.challenge.criteria,
      challengeStartT,
    );
    if (next === "running") return;
    // Defer so the effect stays a subscription to snap ticks, not a sync render cascade.
    const id = window.setTimeout(() => {
      setChallengeStatus(next);
      if (next === "passed" || next === "failed") {
        setSimFrozen(engineRef.current, true);
        setRunning(false);
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [snap, mode, challengeStatus, challengeStartT, scenario.challenge.criteria]);

  const logAction = (msg: string) => {
    setActionLog((prev) =>
      [`t=${engineRef.current.t.toFixed(1)}s. ${msg}`, ...prev].slice(0, 24),
    );
  };

  const onSource = (next: string) => {
    sourceRef.current = next;
    setSource(next);
    applyChapter1Source(engineRef.current, next);
    sync();
  };

  const onRunPage = () => {
    const engine = engineRef.current;
    const wasFrozen = engine.frozen;
    const req = injectSingleRequest(engine, { forceExposed: false });
    let guard = 0;
    while (guard < 500) {
      const live = engine.requests.get(req.id);
      if (!live || live.phase === "done" || live.phase === "timed_out" || live.phase === "waiting" || live.phase === "holding") {
        break;
      }
      tick(engine, 0.01, { force: true });
      guard += 1;
    }
    const caught = engine.requests.get(req.id);
    engine.frozen = caught && (caught.phase === "holding" || caught.phase === "waiting") ? true : wasFrozen;
    if (engine.frozen) setRunning(false);
    engine.tracedId = req.id;
    const live = engine.requests.get(req.id) ?? null;
    setSelectedId(req.id);
    setFocusedReq(live ? { ...live } : null);
    setPreviewToggled(true);
    sync();
    logAction(
      live?.invokedRecommendation
        ? `Ran get_product_page as ${req.id}. The call took a connection.`
        : `Ran get_product_page as ${req.id}. Recommendation was not called.`,
    );
  };

  const onDeployZero = () => {
    setControls(engineRef.current, {
      featureEnabled: true,
      exposurePct: 0,
      featureDisabledForNew: false,
      arrivalRate: 40,
    });
    setDeployedZero(true);
    setSimFrozen(engineRef.current, false);
    setSimFrozen(engineRef.current, false);
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
    setSimFrozen(engineRef.current, false);
    setSimFrozen(engineRef.current, false);
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
    setSimFrozen(engineRef.current, false);
    setSimFrozen(engineRef.current, false);
    setRunning(true);
    sync();
    logAction(`Exposure → ${pct}%`);
  };

  const startPressure = () => {
    // λ×W must exceed 40 so waiters appear (never fake busy > 40).
    setControls(engineRef.current, {
      featureEnabled: true,
      featureDisabledForNew: false,
      exposurePct: 100,
      arrivalRate: 550,
      recLookupSec: 0.09,
      paused: false,
    });
    engineRef.current.arrivalMultiplier = 1;
    setSimFrozen(engineRef.current, false);
    setSimFrozen(engineRef.current, false);
    setRunning(true);
    sync();
    logAction("Pressure: ~550 req/s, full exposure, ~90ms rec holds");
  };

  const applyDecision = (kind: DecisionKind) => {
    setDecision(kind);
    if (kind === "pause_exposure") {
      logAction(
        `Decision: pause exposure at ${engineRef.current.controls.exposurePct}% (traffic continues; cohort frozen)`,
      );
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
        return previewToggled;
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
    if (next === "saturation") {
      setPredictionAnswered(false);
      startPressure();
    }
    if (next === "exposure") setPredictionAnswered(false);
    if (next === "investigate") {
      setControls(engineRef.current, {
        arrivalRate: Math.max(80, engineRef.current.controls.arrivalRate),
        exposurePct: Math.max(25, engineRef.current.controls.exposurePct),
        featureEnabled: true,
      });
      setSimFrozen(engineRef.current, false);
      setSimFrozen(engineRef.current, false);
    setRunning(true);
    }
    setStepId(next);
    sync();
  };

  const enterPractice = () => {
    setMode("practice");
    setChallengeStatus("idle");
    setControls(engineRef.current, {
      arrivalRate: 100,
      exposurePct: 25,
      featureEnabled: true,
      featureDisabledForNew: false,
      recLookupSec: 0.07,
      paused: false,
    });
    setSimFrozen(engineRef.current, false);
    setSimFrozen(engineRef.current, false);
    setRunning(true);
    sync();
  };

  const enterChallenge = () => {
    setMode("challenge");
    stopLoop();
    const seed = replaySeed;
    engineRef.current = createEngine(seed, {
      arrivalRate: 520,
      exposurePct: 100,
      featureEnabled: true,
      featureDisabledForNew: false,
      recLookupSec: 0.09,
      baselineHoldSec: 0.012,
      paused: false,
      acquireTimeoutSec: null,
      shedAtUtil: null,
      cacheHitRate: 0,
    });
    applyChapter1Source(engineRef.current, sourceRef.current);
    // Warm the incident so the learner starts mid-saturation.
    for (let i = 0; i < 400; i++) tick(engineRef.current, 0.01);
    setChallengeStartT(engineRef.current.t);
    setChallengeStatus("running");
    setDecision(null);
    setSelectedId(null);
    setFocusedReq(null);
    setSimFrozen(engineRef.current, false);
    setSimFrozen(engineRef.current, false);
    setRunning(true);
    sync();
    logAction("Challenge started under live pressure");
  };

  const onReplay = () => {
    stopLoop();
    if (mode === "challenge") {
      enterChallenge();
      return;
    }
    setSimFrozen(engineRef.current, true);
    setSimFrozen(engineRef.current, true);
    setRunning(false);
    engineRef.current = createEngine(replaySeed, {
      arrivalRate: mode === "practice" ? 100 : 0,
      featureEnabled: mode === "practice",
      exposurePct: mode === "practice" ? 25 : 0,
    });
    applyChapter1Source(engineRef.current, sourceRef.current);
    setSimFrozen(engineRef.current, true);
    setSelectedId(null);
    setFocusedReq(null);
    setTraced(false);
    setSawWaiters(false);
    logAction(`Replay from seed ${replaySeed}. Queue and clock restored.`);
    sync();
  };

  const onFullReset = () => {
    clearProgress();
    stopLoop();
    setSimFrozen(engineRef.current, true);
    setSimFrozen(engineRef.current, true);
    setRunning(false);
    sourceRef.current = CHAPTER1_SOURCE;
    setSource(CHAPTER1_SOURCE);
    engineRef.current = createEngine(42, {
      arrivalRate: 0,
      featureEnabled: false,
      exposurePct: 0,
    });
    applyChapter1Source(engineRef.current, CHAPTER1_SOURCE);
    setSimFrozen(engineRef.current, true);
    setReplaySeed(42);
    setStepId("inspect");
    setMode("guided");
    setPreviewToggled(false);
    setDeployedZero(false);
    setTraced(false);
    setSawWaiters(false);
    setDecision(null);
    setSelectedId(null);
    setPredictionAnswered(false);
    setActionLog([]);
    setChallengeStatus("idle");
    setSnap(snapshot(engineRef.current));
  };

  const tracedReq = focusedReq;
  const pageReq =
    snap.tracedRequest &&
    snap.tracedRequest.phase !== "done" &&
    snap.tracedRequest.phase !== "timed_out"
      ? snap.tracedRequest
      : snap.lastPage ?? snap.tracedRequest;
  const highlight = pageReq?.codeLine && pageReq.codeLine > 0 ? pageReq.codeLine : 2;

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

  const open = isOpenMode(mode);
  const showProduct = stepId === "inspect" || stepId === "deploy" || open;
  const showPool =
    open ||
    ["trace", "exposure", "saturation", "investigate", "mitigate", "review"].includes(stepId) ||
    snap.activeCount > 0 ||
    snap.waitingCount > 0;
  const showFlag =
    open ||
    ["deploy", "trace", "exposure", "saturation", "investigate", "mitigate", "review"].includes(
      stepId,
    ) ||
    snap.controls.featureEnabled;
  const showMetrics =
    open ||
    ["exposure", "saturation", "investigate", "mitigate", "review"].includes(stepId) ||
    snap.completedCount > 8;
  const showOps =
    open ||
    ["saturation", "investigate", "mitigate", "review"].includes(stepId) ||
    snap.waitingCount > 0 ||
    snap.timeoutCount > 0 ||
    snap.slo.breached;
  const showMitigations =
    open || stepId === "mitigate" || stepId === "review" || stepId === "investigate";
  const showTrace =
    open ||
    ["trace", "exposure", "saturation", "investigate", "mitigate", "review"].includes(stepId) ||
    focusedReq !== null;

  const applyMitigation = (patch: {
    acquireTimeoutSec?: number | null;
    shedAtUtil?: number | null;
    cacheHitRate?: number;
  }) => {
    setControls(engineRef.current, patch);
    setSimFrozen(engineRef.current, false);
    setSimFrozen(engineRef.current, false);
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

  const challengeElapsed = Math.max(0, snap.t - challengeStartT);
  const challengeRemaining = Math.max(
    0,
    scenario.challenge.criteria.maxSimSec - challengeElapsed,
  );

  return (
    <div ref={rootRef} className="relative mx-auto w-full max-w-[88rem] px-4 py-4 sm:px-6 sm:py-5">
      {!reduced ? (
        <motion.div
          aria-hidden="true"
          style={{ y: atmosphereY, opacity: atmosphereOpacity }}
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[#eef3f7]/80"
        />
      ) : null}
      <header className="relative flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0 max-w-3xl flex-1">
        <motion.p
          className="exp-kicker"
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.45, ease }}
        >
          Labs / Chapter {scenario.meta.number} · ~{scenario.meta.durationMin} min
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
            className="mt-2 font-serif text-[1.05rem] italic leading-snug text-[color:var(--exp-amber-text)] sm:text-[1.12rem]"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : 0.08, ease }}
          >
            {scenario.meta.subtitle}
          </motion.p>
        ) : null}
        </div>
        <ChapterPlate
          chapter={scenario.meta.number}
          sizes="200px"
          className="relative z-[1] hidden h-28 w-44 sm:block"
        />
      </header>

      <div className="mt-6 space-y-4">
        <GuidedProgress
          steps={scenario.steps.map((s) => ({
            id: s.id,
            title: s.title,
            letter: s.letter,
          }))}
          stepId={stepId}
          mode={mode}
        />

        <div className="flex flex-wrap items-center gap-3">
          <Segmented<LabMode>
            label="Lab mode"
            layoutId="ch1-mode"
            value={mode}
            onChange={(id) => {
              if (id === "guided") {
                setMode("guided");
                setChallengeStatus("idle");
                if (isOpenMode(mode)) setStepId(decision ? "review" : "inspect");
                return;
              }
              if (id === "practice") enterPractice();
              else enterChallenge();
            }}
            options={[
              { id: "guided", label: "Guided" },
              {
                id: "practice",
                label: "Practice",
                disabled: !decision && mode === "guided",
                title:
                  !decision && mode === "guided"
                    ? "Finish the guided decision first"
                    : undefined,
              },
              {
                id: "challenge",
                label: "Challenge",
                disabled: !decision && mode === "guided",
                title:
                  !decision && mode === "guided"
                    ? "Finish the guided path first"
                    : undefined,
              },
            ]}
          />
          <SimControls
            running={running}
            speed={speed}
            logicalTimeSec={snap.t}
            seed={snap.seed}
            onPlayPause={() => {
              if (running) {
                setSimFrozen(engineRef.current, true);
                setRunning(false);
              } else {
                setSimFrozen(engineRef.current, false);
                setRunning(true);
              }
            }}
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

      <LearningWorkbench
        rail={
          <>
            <LabIntro
              embedded
              challenge="Can you clear pending acquisitions when all 40 connections are assigned?"
              situation={`${scenario.brief} Product Page still talks to Catalog for the core page. When too many users hit the long path, waiting appears beside the pool even though every query is correct.`}
              objective="Finish the guided incident so you can name the shared resource, explain why waiting showed up, and say what disabling the flag does to new versus in-flight work."
              terms="Acquire wait is the time spent waiting for a free connection before the database hold starts. The query stays near its baseline. Busy connections never exceed 40. Overflow waits."
              explore="The recommendation call, the feature flag, and the 40-connection pool."
              gettingStarted="Use Guided for the eight stages. Pause, step, or reset the shared clock anytime. Practice unlocks the levers after your first decision. Challenge starts mid-incident with exact pass and fail numbers, and the intro does not name the fix."
            />
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
                    Step {stepIndex + 1} of {guidedCount || CH1_GUIDED_STAGE_COUNT} ·{" "}
                    {stepDef.letter}
                  </p>
                  <h2 className="mt-2 font-serif text-xl text-[color:var(--exp-fg)]">
                    {stepDef.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-[color:var(--exp-muted)]">
                    {stepDef.body}
                  </p>

                  {stepDef.prediction && !predictionAnswered ? (
                    <div className="mt-4 rounded-xl border border-[color:var(--exp-line)] bg-[color:var(--exp-chip)] p-3">
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

                  {stepDef.prediction && predictionAnswered && stepId === "exposure" ? (
                    <PredictionOutcome
                      snap={snap}
                      answered={predictionAnswered}
                      reducedMotion={reduced}
                    />
                  ) : null}

                  {stepDef.prediction && predictionAnswered && stepId === "saturation" ? (
                    <p className="mt-3 rounded-xl border border-[color:var(--exp-line)] bg-[color:var(--exp-chip)] px-3 py-2.5 text-sm leading-relaxed text-[color:var(--exp-muted)]">
                      <span className="text-[color:var(--exp-fg)]">Expected answer: </span>
                      Disable stops <em>new</em> calls into Recommendation; in-flight busy slots
                      keep their connections until release. pool.pending drains as those holds
                      finish. Disable is not the same as killing in-flight work.
                    </p>
                  ) : null}

                  {stepId === "inspect" ? (
                    <button type="button" onClick={onRunPage} className="exp-btn exp-btn-primary mt-4">
                      Run get_product_page
                    </button>
                  ) : null}

                  {stepId === "deploy" ? (
                    <button
                      type="button"
                      onClick={onDeployZero}
                      className="exp-btn exp-btn-primary mt-4"
                    >
                      Deploy at 0% exposure
                    </button>
                  ) : null}

                  {stepId === "trace" ? (
                    <button type="button" onClick={onTrace} className="exp-btn exp-btn-primary mt-4">
                      Send one request
                    </button>
                  ) : null}

                  {stepId === "exposure" ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onExposure(5)}
                        className="exp-btn exp-btn-ghost"
                      >
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

                  {stepId === "saturation" ? (
                    <button
                      type="button"
                      onClick={startPressure}
                      className="exp-btn exp-btn-primary mt-4"
                    >
                      Surge traffic
                    </button>
                  ) : null}

                  {stepId === "mitigate" ? (
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

                  {stepId === "review" && debriefText ? (
                    <div className="mt-4 space-y-3 text-sm leading-relaxed text-[color:var(--exp-muted)]">
                      <div className="space-y-3 rounded-xl border border-[color:var(--exp-line)] bg-[color:var(--exp-panel)] px-3.5 py-3">
                        <p className="text-[color:var(--exp-fg)]">
                          Exposed traffic held Recommendation’s 40-connection pool for about 70 ms.
                          Arrivals kept coming; waiters grew while busy stayed capped at 40. Home
                          page and checkout share that pool. Product Page does not own it.
                        </p>
                        <p className="text-[color:var(--exp-fg)]">{debriefText}</p>
                        <p className="text-[color:var(--exp-fg)]">
                          Correct code still waits on a shared finite pool. Disabling the flag stops
                          new recommendation calls. Holds already taken finish or time out. The
                          query stays near its baseline.
                        </p>
                      </div>
                      <ul className="mt-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {(
                          [
                            ["Util", `${(snap.utilization * 100).toFixed(0)}%`],
                            ["Pending", `${snap.waitingCount}`],
                            ["Acquire p99", `${(snap.acquireWaitP99 * 1000).toFixed(0)} ms`],
                            ["Timeouts", `${snap.timeoutCount}`],
                          ] as const
                        ).map(([label, value]) => (
                          <li
                            key={label}
                            className="flex items-baseline justify-between gap-2 rounded-lg border border-[color:var(--exp-line)] bg-[color:var(--exp-panel)] px-3 py-2"
                          >
                            <span className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-[color:var(--exp-faint)]">
                              {label}
                            </span>
                            <span className="tabular-nums text-[color:var(--exp-fg)]">{value}</span>
                          </li>
                        ))}
                      </ul>
                      {actionLog.length > 0 ? (
                        <div>
                          <p className="text-[0.8rem] text-[color:var(--exp-faint)]">
                            Actions this run
                          </p>
                          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-[color:var(--exp-faint)]">
                            {actionLog.map((a) => (
                              <li key={a}>{a}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    disabled={!canContinue}
                    onClick={() => {
                      if (stepId === "review") {
                        enterPractice();
                        return;
                      }
                      goNext();
                    }}
                    className="exp-btn exp-btn-solid mt-5 w-full sm:w-auto"
                  >
                    {stepId === "review" ? "Open practice" : "Continue"}
                  </button>
                </motion.div>
              ) : mode === "challenge" ? (
                <motion.div
                  key="challenge"
                  className="exp-panel border-[color-mix(in_srgb,var(--exp-accent)_28%,transparent)]"
                  initial={reduced ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduced ? 0 : 0.35, ease }}
                >
                  <p className="exp-kicker">Challenge</p>
                  <h2 className="mt-2 font-serif text-xl text-[color:var(--exp-fg)]">
                    {scenario.challenge.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-[color:var(--exp-muted)]">
                    {scenario.challenge.objective}
                  </p>
                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
                        Your objective
                      </p>
                      <p className="mt-1 text-sm text-[color:var(--exp-fg)]">
                        {scenario.challenge.success}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
                        Getting started
                      </p>
                      <p className="mt-1 text-sm text-[color:var(--exp-muted)]">
                        {scenario.challenge.gettingStarted}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[color:var(--exp-line)] bg-[color:var(--exp-panel)] px-3 py-2.5">
                      <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
                        Live metrics
                      </p>
                      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                        {(
                          [
                            ["Status", challengeStatusCopy(challengeStatus)],
                            ["Time left", `${challengeRemaining.toFixed(1)} s`],
                            ["Pending", `${snap.waitingCount}`],
                            ["Util", `${(snap.utilization * 100).toFixed(0)}%`],
                            ["End-to-end p99", `${(snap.latencyP99 * 1000).toFixed(0)} ms`],
                            ["Acquire p99", `${(snap.acquireWaitP99 * 1000).toFixed(0)} ms`],
                          ] as const
                        ).map(([label, value]) => (
                          <li key={label} className="text-sm">
                            <span className="text-[color:var(--exp-faint)]">{label}: </span>
                            <span className="text-[color:var(--exp-fg)]">{value}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {challengeStatus === "passed" || challengeStatus === "failed" ? (
                      <p
                        className={`text-sm leading-relaxed ${
                          challengeStatus === "passed"
                            ? "text-[color:var(--exp-amber-text)]"
                            : "text-[color:var(--exp-accent-text)]"
                        }`}
                      >
                        {challengeStatusCopy(challengeStatus)}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={enterChallenge}
                      className="exp-btn exp-btn-primary"
                    >
                      {challengeStatus === "idle" ? "Start challenge" : "Restart challenge"}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="practice"
                  className="exp-panel"
                  initial={reduced ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduced ? 0 : 0.35, ease }}
                >
                  <h2 className="font-serif text-xl text-[color:var(--exp-fg)]">Practice</h2>
                  <p className="mt-2 text-sm text-[color:var(--exp-muted)]">
                    Pressure Recommendation’s 40-connection pool, then stop new recommendation
                    calls. In-flight holds finish or time out. The query does not have to change.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      data-testid="demo-pressure"
                      onClick={() => {
                        startPressure();
                        logAction("Practice demo pressure preset");
                      }}
                      className="exp-btn exp-btn-primary"
                    >
                      Demo pressure
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        startPressure();
                        setControls(engineRef.current, { exposurePct: 25 });
                        logAction("Practice exposure 25% under pressure");
                      }}
                      className="exp-btn exp-btn-ghost"
                    >
                      Pressure, then 25% exposure
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        applyDecision("disable_feature");
                        setSimFrozen(engineRef.current, false);
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
                        setSimFrozen(engineRef.current, false);
    setRunning(true);
                        sync();
                        logAction("Practice calm preset");
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
                        setSimFrozen(engineRef.current, false);
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

                </motion.div>
              )}
            </AnimatePresence>

            <div className="exp-panel-flat">
              <p className="text-[0.8rem] text-[color:var(--exp-faint)]">What this sim assumes</p>
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
          </>
        }
        canvas={
          <>
            <RequestPath snap={snap} reducedMotion={reduced} />
            <LatencyBreakdownChart snap={snap} />
            {showProduct ? <ProductPreview request={pageReq} snap={snap} onRun={onRunPage} /> : null}
            <CodePanel
              source={source}
              highlightLine={highlight}
              onSource={onSource}
              program={chapter1Call({
                exposurePct: snap.appliedExposurePct,
                flagOff: snap.appliedFeatureDisabledForNew || !snap.appliedFeatureEnabled,
                busy: snap.activeCount,
                pending: snap.waitingCount,
                acquireMs: snap.acquireWaitP99 * 1000,
                poolSize: snap.poolSize,
                callsCatalog: snap.handler.callsCatalog,
                callsRecommendation: snap.handler.callsRecommendation,
                acquiresPool: snap.handler.acquiresPool,
                invoked: pageReq?.invokedRecommendation ?? false,
                skipReason: pageReq?.skipReason ?? (snap.handler.callsRecommendation ? "flag" : "listing"),
              })}
              onEdit={() => undefined}
            />
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
                  setSimFrozen(engineRef.current, false);
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
            {showOps ? <OpsMetricsPanel snap={snap} reducedMotion={reduced} /> : null}
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
          </>
        }
      />
    </div>
  );
}

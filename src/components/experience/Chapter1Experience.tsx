"use client";

import Link from "next/link";
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
import { LittlesLawCallout } from "@/components/experience/LittlesLawCallout";
import { MetricsStrip } from "@/components/experience/MetricsStrip";
import { ProductPreview } from "@/components/experience/ProductPreview";
import { RequestTrace } from "@/components/experience/RequestTrace";
import { SimControls } from "@/components/experience/SimControls";

const STEP_ORDER = chapter1Scenario.steps.map((s) => s.id);

function emptySnap(): EngineSnapshot {
  return snapshot(createEngine(42, { arrivalRate: 0, featureEnabled: false, exposurePct: 0 }));
}

function fillDebrief(
  kind: DecisionKind,
  snap: EngineSnapshot,
): string {
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
      const steps = Math.max(1, Math.round(speed));
      for (let i = 0; i < steps; i++) tick(engineRef.current, 0.05);
      sync();
    }, 50);
    return stopLoop;
  }, [running, speed, stopLoop, sync]);

  const logAction = (msg: string) => {
    setActionLog((prev) => [`t=${engineRef.current.t.toFixed(1)}s — ${msg}`, ...prev].slice(0, 20));
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
    setControls(engineRef.current, { exposurePct: pct, featureEnabled: true });
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
    });
    engineRef.current.arrivalMultiplier = 1;
    setRunning(true);
    sync();
    logAction("Pressure: ~550 req/s, full exposure, ~90ms rec holds");
  };

  const applyDecision = (kind: DecisionKind) => {
    setDecision(kind);
    if (kind === "pause_exposure") {
      // Freeze exposure growth; keep current %
      logAction(`Decision: pause exposure at ${engineRef.current.controls.exposurePct}%`);
      setControls(engineRef.current, { paused: true });
      // Reduce new exposed by setting exposure to current but stop increasing — also drop arrival a bit
      setControls(engineRef.current, { arrivalRate: 120 }, false);
    } else if (kind === "disable_feature") {
      setControls(engineRef.current, {
        featureDisabledForNew: true,
        featureEnabled: false,
        exposurePct: 0,
      });
      logAction("Decision: disable feature for new traffic");
    } else {
      logAction("Decision: investigate — left traffic running");
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
      });
      setRunning(true);
    }
    setStepId(next);
    sync();
  };

  const onReplay = () => {
    stopLoop();
    setRunning(false);
    const nextSeed = replaySeed + 17;
    setReplaySeed(nextSeed);
    engineRef.current = createEngine(nextSeed, {
      arrivalRate: mode === "sandbox" ? 100 : 0,
      featureEnabled: false,
      exposurePct: 0,
    });
    setSelectedId(null);
    setFocusedReq(null);
    setTraced(false);
    setSawWaiters(false);
    logAction("Replay — engine reset");
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

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="max-w-3xl">
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-amber">
          Chapter {scenario.meta.number} · ~{scenario.meta.durationMin} min
        </p>
        <h1 className="mt-2 font-serif text-[clamp(1.85rem,4vw,2.75rem)] leading-[1.05] tracking-[-0.03em] text-cream">
          {scenario.meta.title}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-cream/65 sm:text-lg">
          {scenario.brief}
        </p>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex rounded-full border border-cream/15 p-1">
          <button
            type="button"
            onClick={() => setMode("guided")}
            className={`rounded-full px-3.5 py-1.5 text-sm ${
              mode === "guided" ? "bg-cream/15 text-cream" : "text-cream/50"
            }`}
          >
            Guided
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("sandbox");
              setStepId("sandbox");
              setControls(engineRef.current, {
                arrivalRate: 100,
                exposurePct: 25,
                featureEnabled: true,
                featureDisabledForNew: false,
              });
              setRunning(true);
              sync();
            }}
            className={`rounded-full px-3.5 py-1.5 text-sm ${
              mode === "sandbox" ? "bg-cream/15 text-cream" : "text-cream/50"
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

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        {/* Instruction column */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          {mode === "guided" ? (
            <div className="exp-panel border-amber/25">
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-amber">
                Step {stepIndex + 1} of {STEP_ORDER.length}
              </p>
              <h2 className="mt-2 font-serif text-xl text-cream">{stepDef.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-cream/65">{stepDef.body}</p>

              {stepDef.prediction && !predictionAnswered ? (
                <div className="mt-4 rounded-lg border border-cream/15 bg-ink/30 p-3">
                  <p className="text-sm text-cream/80">{stepDef.prediction}</p>
                  <button
                    type="button"
                    className="mt-3 inline-flex min-h-10 items-center rounded-full bg-cream/10 px-4 text-sm text-cream"
                    onClick={() => setPredictionAnswered(true)}
                  >
                    I&apos;ve made my prediction — show me
                  </button>
                </div>
              ) : null}

              {stepId === "inspect" ? (
                <button
                  type="button"
                  onClick={onTogglePreview}
                  className="mt-4 inline-flex min-h-10 items-center rounded-full bg-cinnabar px-4 text-sm font-medium text-cream"
                >
                  Toggle page preview
                </button>
              ) : null}

              {stepId === "review" ? (
                <button
                  type="button"
                  onClick={onDeployZero}
                  className="mt-4 inline-flex min-h-10 items-center rounded-full bg-cinnabar px-4 text-sm font-medium text-cream"
                >
                  Deploy at 0% exposure
                </button>
              ) : null}

              {stepId === "trace" ? (
                <button
                  type="button"
                  onClick={onTrace}
                  className="mt-4 inline-flex min-h-10 items-center rounded-full bg-cinnabar px-4 text-sm font-medium text-cream"
                >
                  Send one request
                </button>
              ) : null}

              {stepId === "rollout" ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onExposure(5)}
                    className="inline-flex min-h-10 items-center rounded-full bg-cream/10 px-4 text-sm text-cream"
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
                    className="inline-flex min-h-10 items-center rounded-full bg-cinnabar px-4 text-sm font-medium text-cream disabled:opacity-40"
                  >
                    Set 25%
                  </button>
                </div>
              ) : null}

              {stepId === "pressure" ? (
                <button
                  type="button"
                  onClick={startPressure}
                  className="mt-4 inline-flex min-h-10 items-center rounded-full bg-cinnabar px-4 text-sm font-medium text-cream"
                >
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
                      className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm ${
                        decision === k
                          ? "bg-cinnabar text-cream"
                          : "border border-cream/20 text-cream/85 hover:border-cream/40"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}

              {stepId === "debrief" && debriefText ? (
                <div className="mt-4 space-y-3 text-sm leading-relaxed text-cream/75">
                  <p>{debriefText}</p>
                  <ul className="list-disc space-y-1 pl-5 text-cream/65">
                    <li>Correct code caused waiting because every exposed request held a shared pool slot.</li>
                    <li>The shared resource is the 40-slot connection pool.</li>
                    <li>
                      Disable stops new recommendation work; in-flight holds finish before slots free.
                    </li>
                  </ul>
                  {actionLog.length > 0 ? (
                    <div>
                      <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-cream/40">
                        Your timeline
                      </p>
                      <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto text-xs text-cream/50">
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
                  className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-cream text-sm font-medium text-ink transition-opacity disabled:opacity-35 sm:w-auto sm:px-6"
                >
                  {stepId === "debrief" ? "Enter sandbox" : "Continue"}
                </button>
              ) : null}
            </div>
          ) : (
            <div className="exp-panel">
              <h2 className="font-serif text-xl text-cream">Sandbox</h2>
              <p className="mt-2 text-sm text-cream/65">
                Vary traffic, exposure, and lookup duration. Same pool and flag visuals.
              </p>
              <label className="mt-4 block text-sm text-cream/70">
                Arrival rate: {snap.controls.arrivalRate} req/s
                <input
                  type="range"
                  min={20}
                  max={500}
                  step={10}
                  value={snap.controls.arrivalRate}
                  onChange={(e) => {
                    setControls(engineRef.current, { arrivalRate: Number(e.target.value) }, false);
                    setRunning(true);
                    sync();
                  }}
                  className="mt-2 w-full accent-cinnabar"
                />
              </label>
              <label className="mt-3 block text-sm text-cream/70">
                Rec lookup: {(snap.controls.recLookupSec * 1000).toFixed(0)} ms
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
                  className="mt-2 w-full accent-cinnabar"
                />
              </label>
              <button
                type="button"
                data-testid="demo-pressure"
                onClick={() => {
                  startPressure();
                  logAction("Sandbox demo pressure preset");
                }}
                className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-full bg-cinnabar px-4 text-sm font-medium text-cream"
              >
                Demo pressure (fill pool)
              </button>
              <Link
                href={scenario.meta.bookHref}
                className="mt-3 inline-flex text-sm text-amber underline-offset-4 hover:underline"
              >
                Read Chapter 1 in the book →
              </Link>
            </div>
          )}

          <div className="exp-panel">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-cream/40">
              Assumptions
            </p>
            <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-cream/50">
              {scenario.assumptions.map((a) => (
                <li key={a}>· {a}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={onFullReset}
              className="mt-3 text-xs text-cream/40 underline-offset-2 hover:text-cream/70 hover:underline"
            >
              Reset guided progress
            </button>
          </div>
        </aside>

        {/* System view */}
        <div className="space-y-4">
          {(stepId === "inspect" || mode === "sandbox") && (
            <ProductPreview showRecs={showRecs} onToggle={onTogglePreview} />
          )}
          <CodePanel lines={scenario.codeLines} highlightLine={highlight} />
          <FeatureFlagPanel
            snap={snap}
            onToggleFeature={(on) => {
              setControls(engineRef.current, {
                featureEnabled: on,
                featureDisabledForNew: on ? false : engineRef.current.controls.featureDisabledForNew,
              });
              setRunning(true);
              sync();
              logAction(`Flag ${on ? "ON" : "OFF"}`);
            }}
            onExposure={onExposure}
            onDisableNew={() => applyDecision("disable_feature")}
          />
          <ConnectionPoolGrid
            snap={snap}
            selectedId={selectedId}
            onSelect={selectRequest}
            reducedMotion={reduced}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <LittlesLawCallout snap={snap} />
            <MetricsStrip snap={snap} />
          </div>
          <RequestTrace req={tracedReq} now={snap.t} />
        </div>
      </div>
    </div>
  );
}

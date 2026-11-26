"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { LessonPlace } from "@/components/learning/LessonCraft";
import { LessonSteps } from "@/components/learning/LessonSteps";
import { lessonAfter, lessonBeats, SRE_COURSE_TOTAL, sreLesson } from "@/lib/learning/sre-course";
import {
  loadSreProgress,
  recordSreProgress,
  sreServerSnapshot,
  subscribeSreProgress,
} from "@/lib/sre/progress";
import Link from "next/link";
import { AlertRuleWorkbench } from "@/components/sre/AlertRuleWorkbench";
import { Segmented } from "@/components/ui/Segmented";
import { LearningWorkbench } from "@/components/learning/LearningWorkbench";
import { TelemetryBoard } from "@/components/sre/TelemetryBoard";
import {
  createSreEngine,
  loadCheckoutWindow,
  runScene,
  runSre,
  snapshotSre,
  type EngineState,
  type Snapshot,
} from "@/lib/sre/engine";
import {
  gradeAlert,
  gradeAlertChallenge,
  gradeInstrument,
  gradeSlo,
  gradeSloChallenge,
  type Grade,
} from "@/lib/sre/grade";
import {
  DEFAULT_TARGET,
  EMPTY_INSTRUMENTATION,
  FULL_INSTRUMENTATION,
  defaultControls,
  type Controls,
  type GoodWhen,
  type Journey,
  type Scene,
} from "@/lib/sre/model";
import { serviceStory } from "@/lib/sre/stories";
import {
  articleFor,
  articleLabel,
  pedagogyOf,
  type SreTelemetryLab,
} from "@/lib/sre/pedagogy";

export type SreLabId = SreTelemetryLab;
type Mode = "guided" | "practice" | "challenge";
type PageScene =
  | "cpu-spike"
  | "warehouse-busy"
  | "late-batches"
  | "short-spike"
  | "sustained"
  | "missing-telemetry";

const MODES = [
  {
    id: "guided" as const,
    label: "Guided",
    title: "In Guided, you finish the current step before the next one opens.",
  },
  {
    id: "practice" as const,
    label: "Practice",
    title: "In Practice, the controls stay open after you have seen the incident once.",
  },
  {
    id: "challenge" as const,
    label: "Challenge",
    title: "Challenge starts mid-incident. The prompt does not name the fix. A pass comes from the numbers.",
  },
];

export function SreExperience({ lab }: { lab: SreLabId }) {
  const reduce = useReducedMotion();
  const progress = useSyncExternalStore(
    subscribeSreProgress,
    loadSreProgress,
    sreServerSnapshot,
  );
  const completed = progress[lab]?.completedModes ?? [];
  useEffect(() => recordSreProgress(lab), [lab]);
  const [mode, setMode] = useState<Mode>("guided");
  const [step, setStep] = useState(0);
  const [seed, setSeed] = useState(7);
  const [controls, setControls] = useState<Controls>(() =>
    initialControls(lab, "guided"),
  );
  const [engine, setEngine] = useState<EngineState>(() =>
    initialEngine(lab, "guided", 7),
  );
  const [traceId, setTraceId] = useState<string | null>(null);
  const [hop, setHop] = useState<"checkout" | "payment" | null>(null);
  const [verdict, setVerdict] = useState<"meet" | "miss" | null>(null);
  const [situation, setSituation] = useState<Scene | null>(null);
  const [pageChoice, setPageChoice] = useState<PageScene | null>(null);
  const [decision, setDecision] = useState<"page" | "hold" | null>(null);
  const [grade, setGrade] = useState<Grade | null>(null);

  const snapshot = useMemo(
    () => snapshotSre(engine, controls),
    [engine, controls],
  );
  const trace =
    snapshot.traces.find((item) => item.id === traceId) ??
    snapshot.traces[0] ??
    null;

  const restart = (nextMode: Mode, nextSeed = seed) => {
    setMode(nextMode);
    setStep(0);
    setSeed(nextSeed);
    setTraceId(null);
    setHop(null);
    setVerdict(null);
    setSituation(null);
    setPageChoice(null);
    setDecision(null);
    setGrade(null);
    let nextControls = initialControls(lab, nextMode);
    if (lab === "api" && nextMode === "challenge") {
      nextControls =
        nextSeed % 2 === 0
          ? {
              ...nextControls,
              docsLagMs: 520,
              contractMismatchRate: 0,
              timeoutMs: 2000,
            }
          : {
              ...nextControls,
              docsLagMs: 0,
              contractMismatchRate: 0.017,
              timeoutMs: 300,
            };
    }
    const nextEngine = initialEngine(lab, nextMode, nextSeed);
    setControls(nextControls);
    setEngine(nextEngine);
  };

  const play = (scene: Scene, patch?: Partial<Controls>) => {
    const played = runScene(scene, seed, { ...controls, ...patch });
    setControls(played.controls);
    setEngine(played.state);
    setSituation(scene);
    setTraceId(played.state.requests.at(-1)?.id ?? null);
    setGrade(null);
  };

  const runCheckout = (seconds: number, patch?: Partial<Controls>) => {
    const next = patch
      ? {
          ...controls,
          ...patch,
          instrumentation: {
            ...controls.instrumentation,
            ...patch.instrumentation,
          },
        }
      : controls;
    if (patch) setControls(next);
    const stepped = runSre(engine, next, seconds);
    setEngine(stepped);
    setTraceId(stepped.requests.at(-1)?.id ?? traceId);
    setGrade(null);
  };

  const check = () => {
    const pedagogy = pedagogyOf(lab);
    const result =
      pedagogy === "instrument"
        ? gradeInstrument({ controls, snapshot, trace, hop })
        : pedagogy === "slo"
          ? mode === "challenge"
            ? gradeSloChallenge(snapshot, controls, verdict)
            : gradeSlo(snapshot, controls)
          : mode === "challenge"
            ? gradeAlertChallenge(snapshot, decision, controls)
            : gradeAlert({ controls, choice: pageChoice });
    setGrade(result);
    if (result.ok) recordSreProgress(lab, mode, result.reason);
  };

  const guided = guidedStep({
    lab,
    step,
    controls,
    snapshot,
    situation,
    play,
    runCheckout,
    setControls,
  });

  const lesson = sreLesson(lab);
  const story = serviceStory(lab);
  return (
    <>
      <header className="sre-lesson-mast">
        <div>
          <LessonPlace
            course="SRE path"
            index={lesson.index}
            total={SRE_COURSE_TOTAL}
            minutes={lesson.minutes}
          />
          <h1>{lesson.title}</h1>
          <LessonSteps
            beats={lessonBeats(lesson)}
            density="compact"
            collapsible
          />
        </div>
        <div className="sre-lesson-modes">
          <Segmented
            value={mode}
            onChange={restart}
            options={MODES}
            label="Mode"
            layoutId={`sre-mode-${lab}`}
            size="sm"
          />
          <p className="sre-mode-saved">
            {completed.length} of 3 modes saved from a passing run on this device
          </p>
        </div>
      </header>
      <LearningWorkbench
        className="!mt-5"
        canvas={
          <>
            <TelemetryBoard
              story={story}
              controls={controls}
              snapshot={snapshot}
              traceId={trace?.id ?? null}
              onTrace={setTraceId}
              hop={hop}
              onHop={setHop}
            />
            {pedagogyOf(lab) === "alert" && mode === "practice" ? (
              <AlertRuleWorkbench
                engine={engine}
                controls={controls}
                onScene={play}
                profile={controls.profile}
              />
            ) : null}
            {grade ? (
              <motion.p
                className={`lab-grade${grade.ok ? " lab-grade-pass" : ""}`}
                role="status"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduce ? 0 : 0.22 }}
              >
                {grade.reason}
                {grade.ok ? (
                  <>
                    {" "}
                    Completion saved in this browser.{" "}
                    <Link href="/sre-labs">View your learning path →</Link>
                  </>
                ) : null}
              </motion.p>
            ) : null}
          </>
        }
        rail={
          <>
            {mode === "guided" ? (
              <div className="exp-panel">
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
                  Step {step + 1} of {guided.total}
                </p>
                <div className="step-meter" aria-hidden="true">
                  {Array.from({ length: guided.total }, (_, index) => (
                    <span
                      key={index}
                      data-on={index <= step ? "true" : "false"}
                    />
                  ))}
                </div>
                <h2 className="lesson-rail-title">
                  {guided.title}
                </h2>
                <div className="mt-2 space-y-3 text-sm leading-relaxed text-[color:var(--exp-muted)]">
                  {guided.body}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {guided.actions}
                </div>
                {step < guided.total - 1 ? (
                  <button
                    type="button"
                    className="exp-btn exp-btn-solid mt-4"
                    disabled={!guided.ready}
                    onClick={() => setStep((value) => value + 1)}
                  >
                    Continue
                  </button>
                ) : pedagogyOf(lab) !== "alert" ? (
                  <button
                    type="button"
                    className="exp-btn exp-btn-solid mt-4"
                    onClick={check}
                  >
                    Check this run
                  </button>
                ) : null}
              </div>
            ) : (
              <PracticeRail
                lab={lab}
                mode={mode}
                controls={controls}
                setControls={setControls}
                verdict={verdict}
                setVerdict={setVerdict}
                pageChoice={pageChoice}
                setPageChoice={setPageChoice}
                decision={decision}
                setDecision={setDecision}
                onRun={() => runCheckout(pedagogyOf(lab) === "instrument" ? 4 : 20)}
                onSpend={() =>
                  lab === "api"
                    ? runCheckout(20, {
                        docsLagMs: 520,
                        contractMismatchRate: 0,
                        errorRate: 0,
                        timeoutMs: 2000,
                        cpu: 0.35,
                      })
                    : runCheckout(20, {
                        errorRate: 0.2,
                        timeoutMs: 300,
                        cpu: 0.35,
                      })
                }
                onMismatch={() =>
                  runCheckout(20, {
                    contractMismatchRate: 0.25,
                    docsLagMs: 0,
                    errorRate: 0,
                    timeoutMs: 300,
                    cpu: 0.35,
                  })
                }
                onAnother={() => restart("challenge", seed + 1)}
                onCheck={check}
              />
            )}
          </>
        }
      />
      <LessonSteps label="After the lesson" beats={lessonAfter(lesson)} />
      {lesson.next ? (
        <p className="lesson-next">
          <Link href={lesson.next.href}>{lesson.next.label}</Link>
        </p>
      ) : null}
    </>
  );
}

function PracticeRail({
  lab,
  mode,
  controls,
  setControls,
  verdict,
  setVerdict,
  pageChoice,
  setPageChoice,
  decision,
  setDecision,
  onRun,
  onSpend,
  onMismatch,
  onAnother,
  onCheck,
}: {
  lab: SreLabId;
  mode: Mode;
  controls: Controls;
  setControls: (value: Controls) => void;
  verdict: "meet" | "miss" | null;
  setVerdict: (value: "meet" | "miss") => void;
  pageChoice: PageScene | null;
  setPageChoice: (value: PageScene) => void;
  decision: "page" | "hold" | null;
  setDecision: (value: "page" | "hold") => void;
  onRun: () => void;
  onSpend: () => void;
  onMismatch: () => void;
  onAnother: () => void;
  onCheck: () => void;
}) {
  return (
    <div className="exp-panel space-y-4">
      <div>
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
          Your objective
        </p>
        <p className="mt-1 text-sm leading-relaxed text-[color:var(--exp-fg)]">
          {objective(lab, mode)}
        </p>
      </div>
      <div>
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
          Getting started
        </p>
        <p className="mt-1 text-sm leading-relaxed text-[color:var(--exp-muted)]">
          {gettingStarted(lab, mode)}
        </p>
      </div>
      {pedagogyOf(lab) === "instrument" && mode === "practice" ? (
        <SignalToggles controls={controls} setControls={setControls} />
      ) : null}
      {pedagogyOf(lab) === "slo" && mode === "practice" ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="exp-btn exp-btn-ghost"
            onClick={onRun}
          >
            {serviceStory(lab).run}
          </button>
          {lab === "api" ? (
            <>
              <button
                type="button"
                className="exp-btn exp-btn-primary"
                onClick={onSpend}
              >
                Raise docs lag
              </button>
              <button
                type="button"
                className="exp-btn exp-btn-ghost"
                onClick={onMismatch}
              >
                Introduce contract mismatches
              </button>
            </>
          ) : (
            <button
              type="button"
              className="exp-btn exp-btn-primary"
              onClick={onSpend}
            >
              Raise failures
            </button>
          )}
        </div>
      ) : null}
      {pedagogyOf(lab) === "slo" && mode === "challenge" ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={choiceClass(verdict === "meet")}
            onClick={() => setVerdict("meet")}
          >
            Meets the target
          </button>
          <button
            type="button"
            className={choiceClass(verdict === "miss")}
            onClick={() => setVerdict("miss")}
          >
            Misses the target
          </button>
        </div>
      ) : null}
      {pedagogyOf(lab) === "alert" && mode === "practice" ? (
        <AlertPicker
          lab={lab}
          controls={controls}
          setControls={setControls}
          pageChoice={pageChoice}
          setPageChoice={setPageChoice}
        />
      ) : null}
      {pedagogyOf(lab) === "alert" && mode === "challenge" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={choiceClass(decision === "page")}
              onClick={() => setDecision("page")}
            >
              Page someone
            </button>
            <button
              type="button"
              className={choiceClass(decision === "hold")}
              onClick={() => setDecision("hold")}
            >
              Do not page
            </button>
          </div>
          <button
            type="button"
            className="exp-btn exp-btn-ghost"
            onClick={onAnother}
          >
            Another incident
          </button>
        </div>
      ) : null}
      {pedagogyOf(lab) === "instrument" ? (
        <button type="button" className="exp-btn exp-btn-ghost" onClick={onRun}>
          {serviceStory(lab).run}
        </button>
      ) : null}
      <button type="button" className="exp-btn exp-btn-solid" onClick={onCheck}>
        Check this run
      </button>
    </div>
  );
}

function SignalToggles({
  controls,
  setControls,
}: {
  controls: Controls;
  setControls: (value: Controls) => void;
}) {
  const toggle = (key: keyof Controls["instrumentation"]) => {
    setControls({
      ...controls,
      instrumentation: {
        ...controls.instrumentation,
        [key]: !controls.instrumentation[key],
      },
    });
  };
  return (
    <div className="space-y-2">
      <Toggle
        on={controls.instrumentation.httpMetrics}
        onClick={() => toggle("httpMetrics")}
        label="HTTP metrics"
      />
      <Toggle
        on={controls.instrumentation.outboundSpan}
        onClick={() => toggle("outboundSpan")}
        label="Outbound span"
      />
      <Toggle
        on={controls.instrumentation.traceContext}
        onClick={() => toggle("traceContext")}
        label="Trace context"
      />
      <Toggle
        on={controls.instrumentation.structuredLogs}
        onClick={() => toggle("structuredLogs")}
        label="Structured logs"
      />
    </div>
  );
}

function AlertPicker({
  lab,
  controls,
  setControls,
  pageChoice,
  setPageChoice,
}: {
  lab: SreLabId;
  controls: Controls;
  setControls: (value: Controls) => void;
  pageChoice: PageScene | null;
  setPageChoice: (value: PageScene) => void;
}) {
  const story = serviceStory(lab);
  const pageRows =
    lab === "analytics"
      ? ([
          ["warehouse-busy", "Warehouse busy"],
          ["short-spike", "Short ingest spike"],
          ["sustained", `Sustained ${story.noun} rejects`],
          ["missing-telemetry", `Missing ${story.noun} metrics`],
        ] as const)
      : ([
          ["cpu-spike", "CPU spike"],
          ["short-spike", "Short spike"],
          ["sustained", `Sustained ${story.noun} failure`],
          ["missing-telemetry", `Missing ${story.noun} metrics`],
        ] as const);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {lab === "analytics" ? (
          <button
            type="button"
            className={choiceClass(controls.alert === "warehouse")}
            onClick={() => setControls({ ...controls, alert: "warehouse" })}
          >
            Warehouse util over 80%
          </button>
        ) : (
          <button
            type="button"
            className={choiceClass(controls.alert === "cpu")}
            onClick={() => setControls({ ...controls, alert: "cpu" })}
          >
            CPU over 80%
          </button>
        )}
        <button
          type="button"
          className={choiceClass(controls.alert === "burn")}
          onClick={() => setControls({ ...controls, alert: "burn" })}
        >
          Burn rate
        </button>
      </div>
      <p className="text-sm leading-relaxed text-[color:var(--exp-muted)]">
        {lab === "analytics"
          ? "Run scenes on the rule board, including late batches. Then name which situation deserves a page under the burn-rate rule."
          : "Which situation deserves a page under the burn-rate rule?"}
      </p>
      <div className="flex flex-col gap-2">
        {pageRows.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={choiceClass(pageChoice === id)}
            onClick={() => setPageChoice(id)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({
  on,
  onClick,
  label,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={choiceClass(on)}
      aria-pressed={on}
    >
      {label}
      <span className="ml-2 font-mono text-[0.68rem]">{on ? "on" : "off"}</span>
    </button>
  );
}

function choiceClass(on: boolean): string {
  return `exp-btn ${on ? "exp-btn-primary" : "exp-btn-ghost"} w-full justify-start`;
}


function withStory(lab: SreLabId, controls: Controls): Controls {
  const story = serviceStory(lab);
  return {
    ...controls,
    handlerSpan: story.handlerSpan,
    dependencySpan: story.dependencySpan,
    requestLog: story.requestLog,
    dependencyLog: story.dependencyLog,
    workNoun: story.noun,
    workPlural: story.plural,
  };
}

function initialControls(lab: SreLabId, mode: Mode): Controls {
  if (pedagogyOf(lab) === "instrument") {
    return withStory(lab, defaultControls({
      instrumentation:
        mode === "challenge"
          ? {
              httpMetrics: true,
              outboundSpan: false,
              traceContext: false,
              structuredLogs: false,
            }
          : { ...EMPTY_INSTRUMENTATION },
      extraLatencyMs: mode === "guided" ? 0 : 400,
      timeoutMs: 2000,
      arrivalRate: 4,
      emitHttp: true,
      alert: "cpu",
      profile: "default",
    }));
  }
  if (lab === "api") {
    return withStory(
      lab,
      defaultControls({
        profile: "api",
        instrumentation: { ...FULL_INSTRUMENTATION },
        timeoutMs: 300,
        arrivalRate: 10,
        target: DEFAULT_TARGET,
        journey: "checkout",
        goodWhen: "both",
        alert: "burn",
        emitHttp: true,
        docsLagMs: mode === "challenge" ? 0 : 0,
        contractMismatchRate: 0,
        errorRate: 0,
      }),
    );
  }
  if (lab === "analytics") {
    return withStory(
      lab,
      defaultControls({
        profile: "analytics",
        instrumentation: { ...FULL_INSTRUMENTATION },
        timeoutMs: 300,
        arrivalRate: 10,
        target: DEFAULT_TARGET,
        journey: "checkout",
        goodWhen: "both",
        alert: mode === "guided" ? "warehouse" : "burn",
        emitHttp: true,
        warehouseUtil: 0.22,
        batchRejectRate: 0,
        lateBatchMs: 0,
        errorRate: 0,
      }),
    );
  }
  return withStory(
    lab,
    defaultControls({
      profile: "default",
      instrumentation: { ...FULL_INSTRUMENTATION },
      timeoutMs: 300,
      arrivalRate: 10,
      target: DEFAULT_TARGET,
      journey: "checkout",
      goodWhen: "both",
      alert: mode === "guided" ? "cpu" : "burn",
      emitHttp: true,
    }),
  );
}

function initialEngine(lab: SreLabId, mode: Mode, seed: number): EngineState {
  const pedagogy = pedagogyOf(lab);
  if (lab === "api" && mode === "challenge") {
    // Docs upstream lag: 17 late 200s in 1,000 gateway calls (98.3%). Traces stay 200.
    return loadCheckoutWindow(seed, {
      total: 1000,
      bad: 17,
      checkoutMs: 90,
      badMs: 520,
      missKind: seed % 2 === 0 ? "latency" : "mismatch",
      host: 0.28,
    });
  }
  if (pedagogy === "slo" && mode === "challenge") {
    return loadCheckoutWindow(seed, {
      total: 1000,
      bad: 17,
      checkoutMs: 80,
      badMs: 800,
    });
  }
  if (pedagogy === "instrument" && mode !== "guided") {
    return runScene("slow-payment", seed, initialControls(lab, mode)).state;
  }
  if (pedagogy === "alert" && mode === "challenge") {
    const base = initialControls(lab, mode);
    const scene =
      seed % 2 === 0
        ? lab === "analytics"
          ? "warehouse-busy"
          : "cpu-spike"
        : "sustained";
    return runScene(scene, seed, base).state;
  }
  return createSreEngine(seed);
}

function guidedStep(input: {
  lab: SreLabId;
  step: number;
  controls: Controls;
  snapshot: Snapshot;
  situation: Scene | null;
  play: (scene: Scene, patch?: Partial<Controls>) => void;
  runCheckout: (seconds: number, patch?: Partial<Controls>) => void;
  setControls: (value: Controls) => void;
}): {
  total: number;
  title: string;
  body: ReactNode;
  actions: ReactNode;
  ready: boolean;
} {
  const pedagogy = pedagogyOf(input.lab);
  if (pedagogy === "instrument") return instrumentGuided(input);
  if (input.lab === "api") return apiGuided(input);
  if (pedagogy === "slo") return sloGuided(input);
  if (input.lab === "analytics") return analyticsGuided(input);
  return alertGuided(input);
}

type GuidedInput = Parameters<typeof guidedStep>[0];

function instrumentGuided(input: GuidedInput) {
  const flags = input.controls.instrumentation;
  const story = serviceStory(input.lab);
  const steps = [
    {
      title: "Playback, before any signal is on",
      ready: true,
      body: (
        <p>
          Playback is calling the manifest service, and none of that is recorded
          yet. Run a play start. The chart, the trace, and the log stay empty
          because the service has no HTTP metrics, no outbound span, no trace
          context, and no structured log.
        </p>
      ),
      actions: (
        <button
          type="button"
          className="exp-btn exp-btn-primary"
          onClick={() => input.runCheckout(3)}
        >
          {story.run}
        </button>
      ),
    },
    {
      title: "Add HTTP metrics",
      ready: flags.httpMetrics && input.snapshot.window.total > 0,
      body: (
        <p>
          HTTP metrics count the play starts and how many of them failed. Turn
          them on and run again. The error line is the share of those calls that
          returned 500 or 504.
        </p>
      ),
      actions: (
        <>
          <Toggle
            on={flags.httpMetrics}
            label="HTTP metrics"
            onClick={() =>
              input.setControls({
                ...input.controls,
                instrumentation: { ...flags, httpMetrics: !flags.httpMetrics },
              })
            }
          />
          <button
            type="button"
            className="exp-btn exp-btn-ghost"
            onClick={() => input.runCheckout(3)}
          >
            {story.run}
          </button>
        </>
      ),
    },
    {
      title: "Add the outbound span",
      ready:
        flags.outboundSpan &&
        input.snapshot.traces.some(
          (trace) => trace.unlinked.length + trace.spans.length > 1,
        ),
      body: (
        <p>
          The playback span only says the request took some time. An outbound
          span is the manifest fetch inside it. Add that span and run again.
          Until trace context is on, the manifest span will not share the
          playback trace id.
        </p>
      ),
      actions: (
        <>
          <Toggle
            on={flags.outboundSpan}
            label="Outbound span"
            onClick={() =>
              input.setControls({
                ...input.controls,
                instrumentation: {
                  ...flags,
                  outboundSpan: !flags.outboundSpan,
                },
              })
            }
          />
          <button
            type="button"
            className="exp-btn exp-btn-ghost"
            onClick={() => input.runCheckout(3)}
          >
            {story.run}
          </button>
        </>
      ),
    },
    {
      title: "The manifest span joins the playback trace",
      ready:
        flags.traceContext &&
        input.snapshot.traces.some((trace) =>
          trace.spans.some((span) => span.name === story.dependencySpan),
        ),
      body: (
        <p>
          Trace context puts the playback trace id on the manifest span. With
          it, that span sits inside the request you opened. Without it, the
          manifest span is a stranger.
        </p>
      ),
      actions: (
        <Toggle
          on={flags.traceContext}
          label="Trace context"
          onClick={() =>
            input.setControls({
              ...input.controls,
              instrumentation: { ...flags, traceContext: !flags.traceContext },
            })
          }
        />
      ),
    },
    {
      title: "Write a structured log",
      ready:
        flags.structuredLogs &&
        input.snapshot.logs.some((log) => log.line.includes("trace_id")),
      body: (
        <p>
          A structured log keeps request id, status, latency, and the trace id
          as fields. Turn it on. The line should name the same trace you have
          open.
        </p>
      ),
      actions: (
        <>
          <Toggle
            on={flags.structuredLogs}
            label="Structured logs"
            onClick={() =>
              input.setControls({
                ...input.controls,
                instrumentation: {
                  ...flags,
                  structuredLogs: !flags.structuredLogs,
                },
              })
            }
          />
          <button
            type="button"
            className="exp-btn exp-btn-ghost"
            onClick={() => input.runCheckout(2)}
          >
            {story.run}
          </button>
        </>
      ),
    },
    {
      title: "The manifest fetch is 400 ms slower",
      ready:
        input.controls.extraLatencyMs >= 200 &&
        input.snapshot.traces.some((trace) => trace.paymentMs > 200),
      body: (
        <p>
          Add 400 ms on the manifest fetch and run again. Open a trace. The
          playback span is the whole request. The manifest span is the part that
          grew. The log records that same manifest time.
        </p>
      ),
      actions: (
        <button
          type="button"
          className="exp-btn exp-btn-primary"
          onClick={() =>
            input.runCheckout(4, {
              extraLatencyMs: 400,
              timeoutMs: 2000,
              arrivalRate: 4,
              errorRate: 0,
            })
          }
        >
          Add manifest latency
        </button>
      ),
    },
  ];
  const current = steps[Math.min(input.step, steps.length - 1)]!;
  return { total: steps.length, ...current };
}

function apiGuided(input: GuidedInput) {
  const story = serviceStory(input.lab);
  const steps = [
    {
      title: `${articleLabel(story.noun)} is the journey, not the host`,
      ready: input.controls.journey === "checkout",
      body: (
        <>
          <p>
            An API SLO is a promise about integrator calls through the gateway.
            Host CPU is a different measurement. If you aim the line at CPU,
            failed {story.plural} will not spend the budget.
          </p>
          <JourneyButtons
            controls={input.controls}
            setControls={input.setControls}
            noun={story.noun}
          />
        </>
      ),
      actions: null,
    },
    {
      title: "Good means success in under 300 ms",
      ready: input.controls.goodWhen === "both",
      body: (
        <>
          <p>
            Count {articleFor(story.noun)} {story.noun} as good only when it
            succeeds in under 300 ms. A contract mismatch (HTTP 400) fails the
            integrator. A 200 that waits on a stale docs upstream still spends
            the budget.
          </p>
          <GoodButtons
            controls={input.controls}
            setControls={input.setControls}
          />
        </>
      ),
      actions: null,
    },
    {
      title: "Docs lag spends the budget without a 500",
      ready:
        input.controls.docsLagMs >= 400 &&
        (input.snapshot.window.spent ?? 0) > 1 &&
        input.snapshot.window.meets === false,
      body: (
        <p>
          Raise docs-upstream lag and run the {story.plural}. The gateway still
          returns 200 for many calls, but the latency line fails. That is a
          different failure mode from hard 500s: the contract looked fine, and
          the integrator still waited.
        </p>
      ),
      actions: (
        <button
          type="button"
          className="exp-btn exp-btn-primary"
          onClick={() =>
            input.runCheckout(20, {
              docsLagMs: 520,
              contractMismatchRate: 0,
              errorRate: 0,
              timeoutMs: 2000,
              arrivalRate: 10,
            })
          }
        >
          Raise docs lag
        </button>
      ),
    },
    {
      title: "Contract mismatches are a second miss class",
      ready:
        input.controls.contractMismatchRate >= 0.2 &&
        input.snapshot.window.meets === false,
      body: (
        <p>
          Reset the lag and introduce OpenAPI mismatches. Those calls return
          400. They spend the success half of the SLI even when latency is fine.
          Name which knob you moved before you read the budget meter.
        </p>
      ),
      actions: (
        <button
          type="button"
          className="exp-btn exp-btn-primary"
          onClick={() =>
            input.runCheckout(20, {
              contractMismatchRate: 0.25,
              docsLagMs: 0,
              errorRate: 0,
              timeoutMs: 300,
              arrivalRate: 10,
            })
          }
        >
          Introduce contract mismatches
        </button>
      ),
    },
  ];
  const current = steps[Math.min(input.step, steps.length - 1)]!;
  return { total: steps.length, ...current };
}

function analyticsGuided(input: GuidedInput) {
  const story = serviceStory(input.lab);
  const steps = [
    {
      title: "A warehouse alert pages with no failed ingest",
      ready:
        input.situation === "warehouse-busy" &&
        input.snapshot.cpuAlert.status === "paging" &&
        input.snapshot.window.meets === true,
      body: (
        <p>
          This rule pages when warehouse util stays over 80%. Run the busy
          warehouse.{" "}
          {story.plural[0]!.toUpperCase() + story.plural.slice(1)} are still
          succeeding. The page fires because the warehouse is busy, not because
          a pipeline is stuck.
        </p>
      ),
      actions: (
        <button
          type="button"
          className="exp-btn exp-btn-primary"
          onClick={() =>
            input.play("warehouse-busy", {
              alert: "warehouse",
              profile: "analytics",
            })
          }
        >
          Run the busy warehouse
        </button>
      ),
    },
    {
      title: "The same alert misses warehouse rejects",
      ready:
        input.situation === "sustained" &&
        input.snapshot.cpuAlert.status === "quiet" &&
        input.snapshot.window.bad > 0,
      body: (
        <p>
          Now ingest batches fail while warehouse util stays near 35%. The
          warehouse alert is quiet. Pipelines are not. A threshold on warehouse
          util cannot see a reject storm.
        </p>
      ),
      actions: (
        <button
          type="button"
          className="exp-btn exp-btn-primary"
          onClick={() =>
            input.play("sustained", { alert: "warehouse", profile: "analytics" })
          }
        >
          {story.runFailures}
        </button>
      ),
    },
    {
      title: "Late batches spend the budget without a reject",
      ready:
        input.situation === "late-batches" &&
        input.snapshot.window.meets === false,
      body: (
        <p>
          Raise warehouse write delay. Many batches still return 200, but they
          miss the latency line. That is a third failure mode: not a busy host,
          not a hard reject, a late success.
        </p>
      ),
      actions: (
        <button
          type="button"
          className="exp-btn exp-btn-primary"
          onClick={() =>
            input.play("late-batches", { alert: "burn", profile: "analytics" })
          }
        >
          Raise late batches
        </button>
      ),
    },
    {
      title: "The burn-rate rule, instead of warehouse util",
      ready: input.controls.alert === "burn",
      body: (
        <p>
          A multiwindow burn-rate alert pages only when the short window and the
          long window both spend the 99.5% budget at 14.4 times the allowed rate
          or faster. Warehouse util can look busy while ingest is fine. Both burn
          windows have to agree before anyone is woken.
        </p>
      ),
      actions: (
        <button
          type="button"
          className="exp-btn exp-btn-primary"
          onClick={() =>
            input.setControls({ ...input.controls, alert: "burn" })
          }
        >
          Use the burn-rate alert
        </button>
      ),
    },
    {
      title: "A short ingest spike does not page",
      ready:
        input.situation === "short-spike" &&
        input.snapshot.burnAlert.status === "quiet" &&
        input.snapshot.shortBurn.hot,
      body: (
        <p>
          Run a short burst of warehouse rejects after a healthy hour. The short
          window burns. The long window still contains healthy {story.plural}, so
          the alert stays quiet.
        </p>
      ),
      actions: (
        <button
          type="button"
          className="exp-btn exp-btn-primary"
          onClick={() =>
            input.play("short-spike", { alert: "burn", profile: "analytics" })
          }
        >
          Run a short ingest spike
        </button>
      ),
    },
    {
      title: "Sustained ingest rejects page",
      ready:
        input.situation === "sustained" &&
        input.snapshot.burnAlert.status === "paging" &&
        input.snapshot.cpuAlert.status !== "paging",
      body: (
        <p>
          Keep the rejects going. Both windows burn, warehouse util stays under
          80%, and the burn-rate alert pages. This is the page that matches the
          pipeline.
        </p>
      ),
      actions: (
        <button
          type="button"
          className="exp-btn exp-btn-primary"
          onClick={() =>
            input.play("sustained", { alert: "burn", profile: "analytics" })
          }
        >
          Run sustained rejects
        </button>
      ),
    },
  ];
  const current = steps[Math.min(input.step, steps.length - 1)]!;
  return { total: steps.length, ...current };
}

function sloGuided(input: GuidedInput) {
  const story = serviceStory(input.lab);
  const steps = [
    {
      title: `${articleLabel(story.noun)} is the journey, not the CPU`,
      ready: input.controls.journey === "checkout",
      body: (
        <>
          <p>
            An SLO is a promise about a journey, not about a host.{" "}
            {articleLabel(story.noun)} is the journey. CPU is a measurement of
            the machine. If you aim the SLO at CPU, failed {story.plural} will
            not spend the budget.
          </p>
          <JourneyButtons
            controls={input.controls}
            setControls={input.setControls}
            noun={story.noun}
          />
        </>
      ),
      actions: null,
    },
    {
      title: "Good means success in under 300 ms",
      ready: input.controls.goodWhen === "both",
      body: (
        <>
          <p>
            Count {articleFor(story.noun)} {story.noun} as good only when it
            succeeds in under 300 ms. A fast 500 still fails the customer. A 200
            that takes 800 ms still spends the budget, because the{" "}
            {story.client.toLowerCase()} already waited.
          </p>
          <GoodButtons
            controls={input.controls}
            setControls={input.setControls}
          />
        </>
      ),
      actions: null,
    },
    {
      title: "The line stays at 99.5 percent",
      ready: input.controls.target === DEFAULT_TARGET,
      body: (
        <p>
          This SLO is 99.5%. In 1,000 {story.plural} the budget is 5 bad calls.
          17 bad calls is 98.3% good. 98.3% does not meet 99.5%. The pass line
          is the number you wrote down, not a nearby number.
        </p>
      ),
      actions: (
        <TargetButtons
          controls={input.controls}
          setControls={input.setControls}
        />
      ),
    },
    {
      title: "The window misses 99.5 percent",
      ready:
        (input.snapshot.window.spent ?? 0) > 1 &&
        input.snapshot.window.meets === false,
      body: (
        <p>
          Raise the failure rate and run the {story.plural}. The bad count, the
          allowed count, and the budget meter all move from those calls. When
          bad {story.plural} pass the allowance, the window has missed 99.5%.
        </p>
      ),
      actions: (
        <button
          type="button"
          className="exp-btn exp-btn-primary"
          onClick={() =>
            input.runCheckout(20, {
              errorRate: 0.2,
              timeoutMs: 300,
              cpu: 0.35,
              arrivalRate: 10,
            })
          }
        >
          Raise failures
        </button>
      ),
    },
  ];
  const current = steps[Math.min(input.step, steps.length - 1)]!;
  return { total: steps.length, ...current };
}

function alertGuided(input: GuidedInput) {
  const story = serviceStory(input.lab);
  const steps = [
    {
      title: `A CPU alert pages with no failed ${story.noun}`,
      ready:
        input.situation === "cpu-spike" &&
        input.snapshot.cpuAlert.status === "paging" &&
        input.snapshot.window.meets === true,
      body: (
        <p>
          This rule pages when CPU stays over 80%. Run the spike.{" "}
          {story.plural[0].toUpperCase() + story.plural.slice(1)} are still
          succeeding. The page fires because the host is busy, not because a{" "}
          {story.client.toLowerCase()} is stuck.
        </p>
      ),
      actions: (
        <button
          type="button"
          className="exp-btn exp-btn-primary"
          onClick={() => input.play("cpu-spike", { alert: "cpu" })}
        >
          Run the CPU spike
        </button>
      ),
    },
    {
      title: `The same alert misses ${story.noun} timeouts`,
      ready:
        input.situation === "sustained" &&
        input.snapshot.cpuAlert.status === "quiet" &&
        input.snapshot.window.bad > 0,
      body: (
        <p>
          Now {story.plural} fail while CPU stays near 35%. The CPU alert is
          quiet. {story.client}s are not. A threshold on the host cannot see
          this.
        </p>
      ),
      actions: (
        <button
          type="button"
          className="exp-btn exp-btn-primary"
          onClick={() => input.play("sustained", { alert: "cpu" })}
        >
          {story.runFailures}
        </button>
      ),
    },
    {
      title: "The burn-rate rule, instead of CPU",
      ready: input.controls.alert === "burn",
      body: (
        <p>
          A multiwindow burn-rate alert pages only when the short window and the
          long window both spend the 99.5% budget at 14.4 times the allowed rate
          or faster. The windows here are 12 seconds and 60 seconds, long enough
          to watch the shape. A single spike lights the short window and then
          fades. Both have to agree before anyone is woken.
        </p>
      ),
      actions: (
        <button
          type="button"
          className="exp-btn exp-btn-primary"
          onClick={() =>
            input.setControls({ ...input.controls, alert: "burn" })
          }
        >
          Use the burn-rate alert
        </button>
      ),
    },
    {
      title: "A short spike does not page",
      ready:
        input.situation === "short-spike" &&
        input.snapshot.burnAlert.status === "quiet" &&
        input.snapshot.shortBurn.hot,
      body: (
        <p>
          Run a short burst of failures after a healthy hour. The short window
          burns. The long window still contains the healthy {story.plural}, so
          the alert stays quiet.
        </p>
      ),
      actions: (
        <button
          type="button"
          className="exp-btn exp-btn-primary"
          onClick={() => input.play("short-spike", { alert: "burn" })}
        >
          Run a short spike
        </button>
      ),
    },
    {
      title: "A sustained failure pages",
      ready:
        input.situation === "sustained" &&
        input.snapshot.burnAlert.status === "paging" &&
        input.snapshot.cpuAlert.status !== "paging",
      body: (
        <p>
          Keep the failures going. Both windows burn, CPU stays under 80%, and
          the burn-rate alert pages. This is the page that matches the customer.
        </p>
      ),
      actions: (
        <button
          type="button"
          className="exp-btn exp-btn-primary"
          onClick={() => input.play("sustained", { alert: "burn" })}
        >
          Run a sustained failure
        </button>
      ),
    },
    {
      title: "No samples is not a healthy window",
      ready:
        input.situation === "missing-telemetry" &&
        input.snapshot.burnAlert.status === "no-data",
      body: (
        <p>
          Stop the {story.noun} metrics while failures continue. The burn alert
          has no samples. It does not draw a healthy 100%, and it does not page.
          You cannot explain a page from a chart that is not there.
        </p>
      ),
      actions: (
        <button
          type="button"
          className="exp-btn exp-btn-primary"
          onClick={() => input.play("missing-telemetry", { alert: "burn" })}
        >
          Stop {story.noun} metrics
        </button>
      ),
    },
  ];
  const current = steps[Math.min(input.step, steps.length - 1)]!;
  return { total: steps.length, ...current };
}

function JourneyButtons({
  controls,
  setControls,
  noun,
}: {
  controls: Controls;
  setControls: (value: Controls) => void;
  noun: string;
}) {
  const setJourney = (journey: Journey) =>
    setControls({ ...controls, journey });
  return (
    <div className="mt-3 flex flex-col gap-2">
      <button
        type="button"
        className={choiceClass(controls.journey === "checkout")}
        onClick={() => setJourney("checkout")}
      >
        {articleLabel(noun)} completes
      </button>
      <button
        type="button"
        className={choiceClass(controls.journey === "cpu")}
        onClick={() => setJourney("cpu")}
      >
        CPU stays under 80%
      </button>
    </div>
  );
}

function GoodButtons({
  controls,
  setControls,
}: {
  controls: Controls;
  setControls: (value: Controls) => void;
}) {
  const setGood = (goodWhen: GoodWhen) =>
    setControls({ ...controls, goodWhen });
  return (
    <div className="mt-3 flex flex-col gap-2">
      <button
        type="button"
        className={choiceClass(controls.goodWhen === "success")}
        onClick={() => setGood("success")}
      >
        Any HTTP 200
      </button>
      <button
        type="button"
        className={choiceClass(controls.goodWhen === "fast")}
        onClick={() => setGood("fast")}
      >
        Under 300 ms, even if it failed
      </button>
      <button
        type="button"
        className={choiceClass(controls.goodWhen === "both")}
        onClick={() => setGood("both")}
      >
        Succeeds in under 300 ms
      </button>
    </div>
  );
}

function TargetButtons({
  controls,
  setControls,
}: {
  controls: Controls;
  setControls: (value: Controls) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {[0.99, 0.995, 0.999].map((target) => (
        <button
          key={target}
          type="button"
          className={choiceClass(controls.target === target)}
          onClick={() => setControls({ ...controls, target })}
        >
          {(target * 100).toFixed(1)}%
        </button>
      ))}
    </div>
  );
}

function objective(lab: SreLabId, mode: Mode): string {
  const pedagogy = pedagogyOf(lab);
  const story = serviceStory(lab);
  if (pedagogy === "instrument") {
    return mode === "challenge"
      ? "Playback is slow. Turn on the missing signal and name the hop that holds the time."
      : "Turn on HTTP metrics, the outbound span, trace context, and a structured log. Then show that the extra latency sits on the manifest fetch.";
  }
  if (pedagogy === "slo") {
    if (mode === "challenge") {
      return `The stated target is on the chart. Decide whether this window of ${story.plural} meets that target.`;
    }
    if (lab === "api") {
      return `Keep the ${story.product} SLO at 99.5%, count only ${articleFor(story.noun)} ${story.noun} that succeeds under 300 ms, and spend the budget with docs lag or contract mismatches.`;
    }
    return `Keep the ${story.product} SLO at 99.5%, count only ${articleFor(story.noun)} ${story.noun} that succeeds under 300 ms, and raise failures until the window spends the budget.`;
  }
  return mode === "challenge"
    ? `Something paged. From the ${story.product.toLowerCase()} telemetry, decide whether a ${story.client.toLowerCase()} is failing badly enough to wake someone.`
    : lab === "analytics"
      ? `Choose the burn-rate alert, then name the situation that deserves a page: sustained warehouse rejects, not a busy warehouse alone.`
      : `Choose the burn-rate alert, then name the situation that deserves a page: the sustained ${story.noun} failure.`;
}

function gettingStarted(lab: SreLabId, mode: Mode): string {
  const pedagogy = pedagogyOf(lab);
  const story = serviceStory(lab);
  if (pedagogy === "instrument") {
    return "Run a play start, turn the four signals on, open a trace, and choose the hop that holds the extra time.";
  }
  if (pedagogy === "slo" && mode === "challenge") {
    if (lab === "api") {
      return "Open a trace. Decide whether late docs upstream responses or contract mismatches left this window under 99.5 percent.";
    }
    return "Read the good count against the stated target. Then mark the window as meeting it or missing it.";
  }
  if (pedagogy === "slo") {
    if (lab === "api") {
      return `Run the ${story.plural}. Then raise docs lag or introduce contract mismatches. The allowed bad count is 0.5% of the window, because the target is 99.5%.`;
    }
    return `Run the ${story.plural}, then raise failures. The allowed bad count is 0.5% of the window, because the target is 99.5%.`;
  }
  if (mode === "challenge") {
    return lab === "analytics"
      ? "Read the warehouse util line, the two burn windows, and a trace before you decide."
      : "Read the CPU line, the two burn windows, and a trace before you decide.";
  }
  return lab === "analytics"
    ? "On the rule board, run late batches and the other scenes. Select the burn-rate alert. A busy warehouse, a short ingest spike, and missing metrics do not deserve a page."
    : "Select the burn-rate alert. The CPU spike, the short spike, and the missing metrics do not deserve a page.";
}

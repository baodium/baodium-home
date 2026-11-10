"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { recordSreProgress } from "@/lib/sre/progress";
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

export type SreLabId = "instrument" | "slo" | "alert";
type Mode = "guided" | "practice" | "challenge";
type PageScene =
  "cpu-spike" | "short-spike" | "sustained" | "missing-telemetry";

const MODES = [
  { id: "guided" as const, label: "Guided" },
  { id: "practice" as const, label: "Practice" },
  { id: "challenge" as const, label: "Challenge" },
];

export function SreExperience({ lab }: { lab: SreLabId }) {
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
    const nextControls = initialControls(lab, nextMode);
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
    const result =
      lab === "instrument"
        ? gradeInstrument({ controls, snapshot, trace, hop })
        : lab === "slo"
          ? mode === "challenge"
            ? gradeSloChallenge(snapshot, controls, verdict)
            : gradeSlo(snapshot, controls)
          : mode === "challenge"
            ? gradeAlertChallenge(snapshot, decision)
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

  return (
    <>
      <header className="sre-lesson-mast">
        <div>
          <p className="exp-kicker">{labTitle(lab)} · Browser simulation</p>
          <h1>{labChallenge(lab)}</h1>
          <p>{objective(lab, mode)}</p>
        </div>
        <Segmented
          value={mode}
          onChange={restart}
          options={MODES}
          label="Mode"
          layoutId={`sre-mode-${lab}`}
          size="sm"
        />
      </header>
      <LearningWorkbench
        canvas={
          <>
            <TelemetryBoard
              controls={controls}
              snapshot={snapshot}
              traceId={trace?.id ?? null}
              onTrace={setTraceId}
              hop={hop}
              onHop={setHop}
            />
            {lab === "alert" && mode === "practice" ? (
              <AlertRuleWorkbench
                engine={engine}
                controls={controls}
                onScene={play}
              />
            ) : null}
            {grade ? (
              <p
                className="exp-panel text-sm leading-relaxed text-[color:var(--exp-fg)]"
                role="status"
              >
                {grade.reason}
                {grade.ok ? (
                  <>
                    {" "}
                    Completion saved in this browser.{" "}
                    <Link
                      href="/sre-labs"
                      className="underline underline-offset-4"
                    >
                      View your learning path →
                    </Link>
                  </>
                ) : null}
              </p>
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
                <h2 className="mt-2 font-serif text-xl text-[color:var(--exp-fg)]">
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
                ) : lab !== "alert" ? (
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
                onRun={() => runCheckout(lab === "instrument" ? 4 : 20)}
                onSpend={() =>
                  runCheckout(20, { errorRate: 0.2, timeoutMs: 300, cpu: 0.35 })
                }
                onAnother={() => restart("challenge", seed + 1)}
                onCheck={check}
              />
            )}
          </>
        }
      />
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
      {lab === "instrument" && mode === "practice" ? (
        <SignalToggles controls={controls} setControls={setControls} />
      ) : null}
      {lab === "slo" && mode === "practice" ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="exp-btn exp-btn-ghost"
            onClick={onRun}
          >
            Run checkout
          </button>
          <button
            type="button"
            className="exp-btn exp-btn-primary"
            onClick={onSpend}
          >
            Raise failures
          </button>
        </div>
      ) : null}
      {lab === "slo" && mode === "challenge" ? (
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
      {lab === "alert" && mode === "practice" ? (
        <AlertPicker
          controls={controls}
          setControls={setControls}
          pageChoice={pageChoice}
          setPageChoice={setPageChoice}
        />
      ) : null}
      {lab === "alert" && mode === "challenge" ? (
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
      {lab === "instrument" ? (
        <button type="button" className="exp-btn exp-btn-ghost" onClick={onRun}>
          Run checkout
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
  controls,
  setControls,
  pageChoice,
  setPageChoice,
}: {
  controls: Controls;
  setControls: (value: Controls) => void;
  pageChoice: PageScene | null;
  setPageChoice: (value: PageScene) => void;
}) {
  const rows = [
    ["cpu-spike", "CPU spike"],
    ["short-spike", "Short spike"],
    ["sustained", "Sustained checkout failure"],
    ["missing-telemetry", "Missing checkout metrics"],
  ] as const;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={choiceClass(controls.alert === "cpu")}
          onClick={() => setControls({ ...controls, alert: "cpu" })}
        >
          CPU over 80%
        </button>
        <button
          type="button"
          className={choiceClass(controls.alert === "burn")}
          onClick={() => setControls({ ...controls, alert: "burn" })}
        >
          Burn rate
        </button>
      </div>
      <p className="text-sm leading-relaxed text-[color:var(--exp-muted)]">
        Which situation deserves a page?
      </p>
      <div className="flex flex-col gap-2">
        {rows.map(([id, label]) => (
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

function initialControls(lab: SreLabId, mode: Mode): Controls {
  if (lab === "instrument") {
    return defaultControls({
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
    });
  }
  return defaultControls({
    instrumentation: { ...FULL_INSTRUMENTATION },
    timeoutMs: 300,
    arrivalRate: 10,
    target: DEFAULT_TARGET,
    journey: "checkout",
    goodWhen: "both",
    alert: mode === "guided" ? "cpu" : "burn",
    emitHttp: true,
  });
}

function initialEngine(lab: SreLabId, mode: Mode, seed: number): EngineState {
  if (lab === "slo" && mode === "challenge") {
    return loadCheckoutWindow(seed, {
      total: 1000,
      bad: 17,
      checkoutMs: 80,
      badMs: 800,
    });
  }
  if (lab === "instrument" && mode !== "guided") {
    return runScene("slow-payment", seed, initialControls(lab, mode)).state;
  }
  if (lab === "alert" && mode === "challenge") {
    const scene = seed % 2 === 0 ? "cpu-spike" : "sustained";
    return runScene(scene, seed, initialControls(lab, mode)).state;
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
  if (input.lab === "instrument") return instrumentGuided(input);
  if (input.lab === "slo") return sloGuided(input);
  return alertGuided(input);
}

type GuidedInput = Parameters<typeof guidedStep>[0];

function instrumentGuided(input: GuidedInput) {
  const flags = input.controls.instrumentation;
  const steps = [
    {
      title: "Look before you add a signal",
      ready: true,
      body: (
        <p>
          Checkout is calling payment, and none of that is recorded yet. Run it
          once. The chart, the trace, and the log stay empty because the service
          has no HTTP metrics, no outbound span, no trace context, and no
          structured log.
        </p>
      ),
      actions: (
        <button
          type="button"
          className="exp-btn exp-btn-primary"
          onClick={() => input.runCheckout(3)}
        >
          Run checkout
        </button>
      ),
    },
    {
      title: "Add HTTP metrics",
      ready: flags.httpMetrics && input.snapshot.window.total > 0,
      body: (
        <p>
          HTTP metrics count the checkouts and how many of them failed. Turn
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
            Run checkout
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
          The checkout span only says the request took some time. An outbound
          span is the payment call inside it. Add that span and run again. Until
          trace context is on, the payment span will not share the checkout
          trace id.
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
            Run checkout
          </button>
        </>
      ),
    },
    {
      title: "Carry the trace id",
      ready:
        flags.traceContext &&
        input.snapshot.traces.some((trace) =>
          trace.spans.some((span) => span.name === "payment charge"),
        ),
      body: (
        <p>
          Trace context puts the checkout trace id on the payment span. With it,
          the slow hop sits inside the request you opened. Without it, the
          payment span is a stranger.
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
            Run checkout
          </button>
        </>
      ),
    },
    {
      title: "Add latency and read the trace",
      ready:
        input.controls.extraLatencyMs >= 200 &&
        input.snapshot.traces.some((trace) => trace.paymentMs > 200),
      body: (
        <p>
          Add 400 ms on the payment call and run again. Open a trace. The
          checkout span is the whole request. The payment span is the part that
          grew. The log records that same payment time.
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
          Add payment latency
        </button>
      ),
    },
  ];
  const current = steps[Math.min(input.step, steps.length - 1)]!;
  return { total: steps.length, ...current };
}

function sloGuided(input: GuidedInput) {
  const steps = [
    {
      title: "Choose the journey a customer feels",
      ready: input.controls.journey === "checkout",
      body: (
        <>
          <p>
            An SLO is a promise about a journey, not about a host. Checkout is
            the journey. CPU is a measurement of the machine. If you aim the SLO
            at CPU, failed checkouts will not spend the budget.
          </p>
          <JourneyButtons
            controls={input.controls}
            setControls={input.setControls}
          />
        </>
      ),
      actions: null,
    },
    {
      title: "Decide what counts as good",
      ready: input.controls.goodWhen === "both",
      body: (
        <>
          <p>
            A 500 that returns quickly is not a good checkout. A 200 that takes
            800 ms is not a good checkout either. Count the call as good only
            when it succeeds in under 300 ms.
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
      title: "Set the target, and keep it",
      ready: input.controls.target === DEFAULT_TARGET,
      body: (
        <p>
          This SLO is 99.5%. In 1,000 checkouts the budget is 5 bad calls. 17
          bad calls is 98.3% good. 98.3% does not meet 99.5%. The pass line is
          the number you wrote down, not a nearby number.
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
      title: "Spend the budget",
      ready:
        (input.snapshot.window.spent ?? 0) > 1 &&
        input.snapshot.window.meets === false,
      body: (
        <p>
          Raise the failure rate and run the checkout. The bad count, the
          allowed count, and the budget meter all move from those calls. When
          bad checkouts pass the allowance, the window has missed 99.5%.
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
  const steps = [
    {
      title: "A CPU alert pages with no failed checkout",
      ready:
        input.situation === "cpu-spike" &&
        input.snapshot.cpuAlert.status === "paging" &&
        input.snapshot.window.meets === true,
      body: (
        <p>
          This rule pages when CPU stays over 80%. Run the spike. Checkout is
          still succeeding. The page fires because the host is busy, not because
          a customer is stuck.
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
      title: "The same alert misses checkout timeouts",
      ready:
        input.situation === "sustained" &&
        input.snapshot.cpuAlert.status === "quiet" &&
        input.snapshot.window.bad > 0,
      body: (
        <p>
          Now checkouts fail while CPU stays near 35%. The CPU alert is quiet.
          Customers are not. A threshold on the host cannot see this.
        </p>
      ),
      actions: (
        <button
          type="button"
          className="exp-btn exp-btn-primary"
          onClick={() => input.play("sustained", { alert: "cpu" })}
        >
          Run checkout failures
        </button>
      ),
    },
    {
      title: "Page on the checkout SLO",
      ready: input.controls.alert === "burn",
      body: (
        <p>
          A multiwindow burn-rate alert pages only when the short window and the
          long window both spend the 99.5% budget at 14.4 times the allowed rate
          or faster. The windows here are 12 seconds and 60 seconds, so you can
          watch the shape. A single spike lights the short window and then
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
          burns. The long window still contains the healthy checkouts, so the
          alert stays quiet.
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
      title: "Missing telemetry is not a quiet SLO",
      ready:
        input.situation === "missing-telemetry" &&
        input.snapshot.burnAlert.status === "no-data",
      body: (
        <p>
          Stop the checkout metrics while failures continue. The burn alert has
          no samples. It does not draw a healthy 100%, and it does not page. You
          cannot explain a page from a chart that is not there.
        </p>
      ),
      actions: (
        <button
          type="button"
          className="exp-btn exp-btn-primary"
          onClick={() => input.play("missing-telemetry", { alert: "burn" })}
        >
          Stop checkout metrics
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
}: {
  controls: Controls;
  setControls: (value: Controls) => void;
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
        Checkout completes
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

function labTitle(lab: SreLabId): string {
  if (lab === "instrument") return "Instrument a service";
  if (lab === "slo") return "Error budget";
  return "An alert that deserves a page";
}

function labChallenge(lab: SreLabId): string {
  if (lab === "instrument") return "Can you see which hop made checkout slow?";
  if (lab === "slo") return "Can you spend the budget you actually wrote down?";
  return "Can you tell why the pager fired?";
}

function objective(lab: SreLabId, mode: Mode): string {
  if (lab === "instrument") {
    return mode === "challenge"
      ? "Checkout is slow. Turn on the missing signal and name the hop that holds the time."
      : "Turn on HTTP metrics, the outbound span, trace context, and a structured log. Then show that the extra latency sits on the payment span.";
  }
  if (lab === "slo") {
    return mode === "challenge"
      ? "The stated target is on the chart. Decide whether this window meets that target."
      : "Keep the checkout SLO at 99.5%, count only a success under 300 ms, and raise failures until the window spends the budget.";
  }
  return mode === "challenge"
    ? "Something paged. From the checkout telemetry, decide whether a customer is failing badly enough to wake someone."
    : "Choose the burn-rate alert, then name the situation that deserves a page: the sustained checkout failure.";
}

function gettingStarted(lab: SreLabId, mode: Mode): string {
  if (lab === "instrument") {
    return "Run the checkout, turn the four signals on, open a trace, and choose the hop that holds the extra time.";
  }
  if (lab === "slo" && mode === "challenge") {
    return "Read the good count against the stated target. Then mark the window as meeting it or missing it.";
  }
  if (lab === "slo") {
    return "Run the checkout, then raise failures. The allowed bad count is 0.5% of the window, because the target is 99.5%.";
  }
  if (mode === "challenge") {
    return "Read the CPU line, the two burn windows, and a trace before you decide.";
  }
  return "Select the burn-rate alert. The CPU spike, the short spike, and the missing metrics do not deserve a page.";
}

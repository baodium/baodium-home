"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ModeTrack } from "@/components/sre/ModeTrack";
import {
  loadSreProgress,
  recordSreProgress,
  sreServerSnapshot,
  subscribeSreProgress,
} from "@/lib/sre/progress";
import { CascadeTrends } from "@/components/sre/CascadeTrends";
import { CascadePortrait } from "@/components/sre/CascadePortrait";
import { LaboratoryShell } from "@/components/sre/LaboratoryShell";
import {
  advanceEngine,
  DEFAULT_TICK_SEC,
  createEngine,
  setSimFrozen,
  tick,
  type Engine,
} from "@/lib/experience/engine";
import {
  attachCascade,
  cascadeView,
  gradeCascade,
  healthyControls,
  incidentControls,
  mitigationControls,
  setCascadeControls,
  type CascadeControls,
  type CascadeLog,
  type CascadeService,
  type CascadeView,
} from "@/lib/experience/cascade";

type Mode = "guided" | "practice" | "challenge";
type Tab = "metrics" | "traces" | "logs" | "timeline";

const MODES = [
  { id: "guided" as const, label: "Guided" },
  { id: "practice" as const, label: "Practice" },
  { id: "challenge" as const, label: "Challenge" },
];

const TABS: { id: Tab; label: string }[] = [
  { id: "metrics", label: "Metrics" },
  { id: "traces", label: "Traces" },
  { id: "logs", label: "Logs" },
  { id: "timeline", label: "Timeline" },
];

const CONTROL_LABELS: Record<keyof CascadeControls, string> = {
  arrivalRate: "Arrivals/s",
  providerLatencyMs: "Provider work (ms)",
  maxRetries: "Retry limit",
  attemptTimeoutMs: "Attempt timeout (ms)",
  clientDeadlineMs: "Client deadline (ms)",
  backoffMs: "Backoff (ms)",
  cancelInFlight: "Cancel abandoned work",
  propagateDeadline: "Propagate deadline",
  shedAtInflight: "Shed at open checkouts",
};

const SERVICES: { id: CascadeService; label: string }[] = [
  { id: "gateway", label: "Gateway" },
  { id: "checkout", label: "Checkout" },
  { id: "payment", label: "Payment" },
  { id: "provider", label: "Provider" },
];

type Step = {
  look: string;
  action?: string;
  patch?: CascadeControls;
  seconds?: number;
};

const STEPS: Step[] = [
  {
    look: "The gateway is quiet until the clock moves. A healthy window is one provider call per checkout, and the call finishes well inside the attempt timeout.",
    action: "Run a healthy baseline",
    patch: healthyControls(),
    seconds: 6,
  },
  {
    look: "Healthy checkouts are succeeding. Each trace has one provider span, and the provider slots are mostly free.",
    action: "Slow the provider, and keep the timeout long enough to cover it",
    patch: {
      ...healthyControls(),
      providerLatencyMs: 700,
      attemptTimeoutMs: 1200,
      maxRetries: 0,
      cancelInFlight: true,
      propagateDeadline: true,
    },
    seconds: 6,
  },
  {
    look: "Provider work is now hundreds of milliseconds. Success still holds, because payment waits long enough for that one call and does not retry.",
    action: "Shorten the timeout and allow four retries",
    patch: incidentControls(),
    seconds: 8,
  },
  {
    look: "Payment is giving up before the provider finishes, then calling again. The log says the slot was kept. Open a trace and count the provider spans. The timeline uses those same events.",
    action: "Cap retries, and release the slot on timeout",
    patch: {
      ...incidentControls(),
      maxRetries: 0,
      cancelInFlight: true,
      propagateDeadline: true,
    },
    seconds: 8,
  },
  {
    look: "The extra calls stopped, and the slots drained. Success is still low, because the attempt timeout is shorter than the provider work. The shopper never receives the slow answer.",
    action: "Wait long enough for the provider work",
    patch: mitigationControls(),
    seconds: 8,
  },
  {
    look: "The first provider call now finishes, so payment does not retry. Success is back, and the slots are no longer pinned full. Check this run when the last 5 seconds agree.",
  },
];

export function CascadeLab() {
  const [mode, setMode] = useState<Mode>("guided");
  const [nonce, setNonce] = useState(0);
  return (
    <CascadeSession
      key={`${mode}-${nonce}`}
      mode={mode}
      setMode={setMode}
      onReplay={() => setNonce((value) => value + 1)}
    />
  );
}

function CascadeSession({
  mode,
  setMode,
  onReplay,
}: {
  mode: Mode;
  setMode: (mode: Mode) => void;
  onReplay: () => void;
}) {
  const [initialEngine] = useState(() => {
    const engine = createEngine(42);
    attachCascade(
      engine,
      mode === "challenge" ? incidentControls() : healthyControls(),
    );
    if (mode === "challenge") advanceEngine(engine, 5);
    setSimFrozen(engine, true);
    return engine;
  });
  const engineRef = useRef<Engine | null>(initialEngine);
  const [step, setStep] = useState(0);
  const [actions, setActions] = useState<
    { t: number; label: string; patch: Partial<CascadeControls> }[]
  >([]);
  const [historyFull, setHistoryFull] = useState(false);
  const [notes, setNotes] = useState("");
  const [speed, setSpeed] = useState(1);
  const [logService, setLogService] = useState("all");
  const [logKind, setLogKind] = useState("all");
  const [logQuery, setLogQuery] = useState("");
  const progress = useSyncExternalStore(
    subscribeSreProgress,
    loadSreProgress,
    sreServerSnapshot,
  );
  useEffect(() => recordSreProgress("cascade"), []);
  const remember = (
    t: number,
    partial: Partial<CascadeControls>,
    label: string,
  ) => {
    if (actions.length >= 200) {
      setHistoryFull(true);
      return;
    }
    setActions((previous) => [
      ...previous,
      { t, patch: { ...partial }, label },
    ]);
  };
  const [playing, setPlaying] = useState(false);
  const [controls, setControls] = useState<CascadeControls>(() => ({
    ...initialEngine.cascade!.controls,
  }));
  const [view, setView] = useState<CascadeView | null>(() =>
    cascadeView(initialEngine.cascade!, initialEngine.t),
  );
  const [selected, setSelected] = useState<CascadeService>("gateway");
  const [traceId, setTraceId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("metrics");
  const [grade, setGrade] = useState<{ ok: boolean; reason: string } | null>(
    null,
  );

  const publish = useCallback(() => {
    const engine = engineRef.current;
    if (!engine?.cascade) return;
    setView(cascadeView(engine.cascade, engine.t));
    setControls({ ...engine.cascade.controls });
  }, []);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    let lastPublish = last;
    let accumulator = 0;
    const loop = (now: number) => {
      const engine = engineRef.current;
      if (engine && !engine.frozen) {
        const real = Math.min(0.05, (now - last) / 1000);
        last = now;
        accumulator += real * speed;
        while (accumulator >= DEFAULT_TICK_SEC) {
          tick(engine, DEFAULT_TICK_SEC);
          accumulator -= DEFAULT_TICK_SEC;
        }
        if (now - lastPublish >= 100) {
          publish();
          lastPublish = now;
        }
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [playing, publish, speed]);

  const patch = (partial: Partial<CascadeControls>) => {
    const engine = engineRef.current;
    if (!engine?.cascade) return;
    remember(
      engine.t,
      partial,
      Object.entries(partial)
        .map(
          ([key, value]) =>
            `${CONTROL_LABELS[key as keyof CascadeControls]} → ${value === null ? "off" : value}`,
        )
        .join("; "),
    );
    setCascadeControls(engine.cascade, partial);
    setControls({ ...engine.cascade.controls });
    setGrade(null);
  };

  const runStep = () => {
    const spec = STEPS[step];
    const engine = engineRef.current;
    if (!spec?.patch || !engine?.cascade) return;
    remember(
      engine.t,
      spec.patch,
      spec.action ?? "Guided configuration change",
    );
    setCascadeControls(engine.cascade, spec.patch);
    setSimFrozen(engine, true);
    setPlaying(false);
    advanceEngine(engine, spec.seconds ?? 6);
    publish();
    setStep((value) => value + 1);
    setGrade(null);
    setTab(step === 2 ? "traces" : "metrics");
  };

  const togglePlay = () => {
    const engine = engineRef.current;
    if (!engine) return;
    if (playing) {
      setSimFrozen(engine, true);
      setPlaying(false);
      publish();
      return;
    }
    setGrade(null);
    setSimFrozen(engine, false);
    setPlaying(true);
  };

  const stepClock = () => {
    const engine = engineRef.current;
    if (!engine) return;
    setPlaying(false);
    setSimFrozen(engine, true);
    advanceEngine(engine, 0.5);
    setGrade(null);
    publish();
  };

  const check = () => {
    const engine = engineRef.current;
    if (!engine?.cascade || !view) return;
    const currentView = cascadeView(engine.cascade, engine.t);
    setView(currentView);
    const result = gradeCascade(currentView, {
      mode,
      demonstrated: engine.cascade.demonstratedAmplification,
    });
    setSimFrozen(engine, true);
    setPlaying(false);
    setGrade(result);
    if (result.ok) recordSreProgress("cascade", mode, result.reason);
  };

  const replay = () => {
    if (historyFull) return;
    const targetTime = engineRef.current?.t ?? 0;
    const engine = createEngine(42);
    attachCascade(
      engine,
      mode === "challenge" ? incidentControls() : healthyControls(),
    );
    setSimFrozen(engine, true);
    if (mode === "challenge") advanceEngine(engine, 5);
    for (const action of actions) {
      if (action.t - engine.t > DEFAULT_TICK_SEC / 2)
        advanceEngine(engine, action.t - engine.t);
      setCascadeControls(engine.cascade!, action.patch);
    }
    if (targetTime - engine.t > DEFAULT_TICK_SEC / 2)
      advanceEngine(engine, targetTime - engine.t);
    engineRef.current = engine;
    setPlaying(false);
    setGrade(null);
    publish();
  };

  const current = STEPS[Math.min(step, STEPS.length - 1)]!;
  const trace =
    view?.traces.find((item) => item.traceId === traceId) ??
    view?.traces[0] ??
    null;
  const service = view?.services.find((item) => item.service === selected);

  return (
    <LaboratoryShell
      toolbar={
        <p className="product-eyebrow">
          Gateway / Checkout / Payment / Provider
        </p>
      }
      mission={
        <div className="cascade-mast">
          <p className="exp-kicker">SRE lab, incident investigation</p>
          <h1 className="cascade-title">
            {mode === "challenge"
              ? "Checkout success collapsed."
              : "A checkout is failing, and the failure is spreading."}
          </h1>
          <p className="laboratory-status">
            {grade
              ? grade.ok
                ? "Assessment passed · paused"
                : "Review needed · paused"
              : playing
                ? "Running"
                : view?.t
                  ? "Paused"
                  : "Ready"}{" "}
            · seed 42
          </p>
          <div className="cascade-modes" role="group" aria-label="Mode">
            {MODES.map((item, index) => (
              <span key={item.id} className="cascade-mode">
                {index > 0 ? (
                  <span className="cascade-slash" aria-hidden="true">
                    /
                  </span>
                ) : null}
                <button
                  type="button"
                  aria-pressed={mode === item.id}
                  onClick={() => setMode(item.id)}
                >
                  {item.label}
                </button>
              </span>
            ))}
            <span className="cascade-clock">
              t {view ? view.t.toFixed(1) : "0.0"}s · seed 42
            </span>
          </div>
          <ModeTrack
            completed={progress.cascade?.completedModes ?? []}
            current={mode}
          />
        </div>
      }
      brief={
        <>
          <div className="cascade-lede">
            {mode === "guided" ? (
              <>
                <p className="cascade-step">
                  Step {Math.min(step + 1, STEPS.length)} of {STEPS.length}
                </p>
                <p>{current.look}</p>
              </>
            ) : null}
            {mode === "practice" ? (
              <p>
                <strong>Your objective.</strong> Make the provider slow enough,
                and the attempt timeout short enough, that retries multiply and
                checkout success falls. Then restore the last 5 seconds: success
                at or above 95%, at most 1.25 provider calls per checkout,
                provider slots under 90% full, and at least half of the arrivals
                succeeding.
              </p>
            ) : null}
            {mode === "challenge" ? (
              <p>
                <strong>Your objective.</strong> In the last 5 seconds, checkout
                success reaches 95%, each finished checkout starts at most 1.25
                provider calls, provider slots stay under 90% full, and at least
                half of the arrivals succeed.
              </p>
            ) : null}
          </div>
          <details className="laboratory-objectives">
            <summary>What counts as recovery?</summary>
            <ul>
              <li>At least 8 completed checkouts in the last 5 seconds.</li>
              <li>
                Success ≥95%; provider calls ≤1.25 per completed checkout.
              </li>
              <li>
                Provider slots under 90%; successful arrivals at least half the
                offered rate.
              </li>
              <li>
                Guided and practice modes must first demonstrate retry
                amplification.
              </li>
            </ul>
          </details>
          <div className="cascade-actions">
            {mode === "guided" && current.action ? (
              <button
                type="button"
                className="exp-btn exp-btn-primary cascade-cta"
                onClick={runStep}
              >
                {current.action}
              </button>
            ) : (
              <button
                type="button"
                className="exp-btn exp-btn-primary cascade-cta"
                onClick={check}
              >
                Check this run
              </button>
            )}
            <div className="cascade-subactions">
              <button type="button" onClick={togglePlay} aria-pressed={playing}>
                {playing ? "Pause" : "Play"}
              </button>
              <button type="button" onClick={stepClock}>
                Step 0.5s
              </button>
              <button type="button" onClick={onReplay}>
                Reset
              </button>
              <button
                type="button"
                onClick={replay}
                disabled={historyFull || !view?.t}
              >
                Replay experiment
              </button>
              <label className="lab-speed">
                Speed{" "}
                <select
                  aria-label="Simulation speed"
                  value={speed}
                  onChange={(event) => setSpeed(Number(event.target.value))}
                >
                  <option value={1}>1×</option>
                  <option value={2}>2×</option>
                  <option value={4}>4×</option>
                </select>
              </label>
            </div>
          </div>
          {historyFull ? (
            <p role="status" className="text-sm">
              Replay history reached its 200-action limit. Reset to record a new
              experiment.
            </p>
          ) : null}
          {grade ? (
            <p
              role="status"
              className={`cascade-result ${grade.ok ? "is-ok" : ""}`}
            >
              {grade.reason}
              {grade.ok
                ? " Completion saved in this browser."
                : " Change a control, advance the clock, then check again."}
            </p>
          ) : null}
        </>
      }
      topology={
        view ? (
          <CascadePortrait
            view={view}
            selected={selected}
            onSelect={setSelected}
          />
        ) : (
          <p className="cascade-waiting">The clock has not started.</p>
        )
      }
      preface={
        mode === "practice" ? (
          <p>
            A timeout shorter than the provider work makes payment retry. If the
            timeout does not release the slot, the provider keeps working after
            the caller has gone, and the next retry waits behind it. Raising the
            timeout above the measured provider work lets the first call finish.
            Capping retries stops the extra calls even when the timeout stays
            short, and the shopper still fails until the wait covers the work.
          </p>
        ) : mode === "challenge" ? (
          <p>
            Play or step the clock. Select a service, then open a trace and the
            log for the same trace id. Provider latency is measured from the
            spans. You can change the retry limit, the attempt timeout, the
            client deadline, whether a timeout releases the provider slot,
            whether payment refuses work that cannot finish before the deadline,
            and whether the gateway sheds load.
          </p>
        ) : null
      }
      inspection={
        <>
          <div className="cascade-card">
            <h2 className="cascade-card-title">
              {SERVICES.find((item) => item.id === selected)?.label}
            </h2>
            {service && view ? (
              <dl className="mt-3 space-y-2 text-sm leading-relaxed text-[color:var(--exp-muted)]">
                <div className="flex justify-between gap-3">
                  <dt>
                    {selected === "gateway" ? "Open checkouts" : "Open spans"}
                  </dt>
                  <dd className="font-mono text-[color:var(--exp-fg)]">
                    {selected === "gateway" ? view.openJourneys : service.open}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Finished in 5s</dt>
                  <dd className="font-mono text-[color:var(--exp-fg)]">
                    {selected === "gateway" ? view.finished : service.ended}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>{selected === "gateway" ? "Checkout p99" : "Hop p99"}</dt>
                  <dd className="font-mono text-[color:var(--exp-fg)]">
                    {Math.round(
                      selected === "gateway"
                        ? view.gatewayP99Ms
                        : service.p99Ms,
                    )}{" "}
                    ms
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>
                    {selected === "gateway"
                      ? "Checkout failed"
                      : "Failed share"}
                  </dt>
                  <dd className="font-mono text-[color:var(--exp-fg)]">
                    {selected === "gateway"
                      ? view.successRate == null
                        ? "no samples"
                        : `${Math.round((1 - view.successRate) * 100)}%`
                      : service.errorRate == null
                        ? "no samples"
                        : `${Math.round(service.errorRate * 100)}%`}
                  </dd>
                </div>
                {selected === "provider" ? (
                  <>
                    <div className="flex justify-between gap-3">
                      <dt>Slots in use</dt>
                      <dd className="font-mono text-[color:var(--exp-fg)]">
                        {view?.providerBusy ?? 0} / {view?.providerSlots ?? 8}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>Queue</dt>
                      <dd className="font-mono text-[color:var(--exp-fg)]">
                        {view?.providerQueue ?? 0}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>Measured work</dt>
                      <dd className="font-mono text-[color:var(--exp-fg)]">
                        {view?.measuredProviderMs == null
                          ? "no samples"
                          : `${Math.round(view.measuredProviderMs)} ms`}
                      </dd>
                    </div>
                  </>
                ) : null}
              </dl>
            ) : (
              <p className="mt-3 text-sm text-[color:var(--exp-muted)]">
                Select a service on the path.
              </p>
            )}
            <p className="mt-3 text-sm leading-relaxed text-[color:var(--exp-muted)]">
              Checkout p99 is the slow end of the shopper&apos;s wait. Hop p99
              is the span on the service you selected. Slot use counts provider
              work that is still running, including work the caller already
              abandoned.
            </p>
          </div>
          <div className="lab-notes">
            <label htmlFor="incident-notes">Your hypothesis and evidence</label>
            <textarea
              id="incident-notes"
              value={notes}
              maxLength={3000}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Which dependency is slow? What evidence supports your next action?"
            />
            <small>
              Notes are for reflection in this run. They are not automatically
              graded or saved after reset.
            </small>
          </div>
          <div className="cascade-card">
            <h2 className="cascade-card-title">Adjust the checkout</h2>
            {mode === "challenge" ? (
              <p className="text-sm leading-relaxed text-[color:var(--exp-muted)]">
                Provider work in this window is{" "}
                {view?.measuredProviderMs == null
                  ? "still waiting for a sample"
                  : `${Math.round(view.measuredProviderMs)} ms`}
                . The next attempt uses that measured latency.
              </p>
            ) : (
              <Slider
                label="Provider work"
                hint="How long the external provider keeps a slot once it starts. New attempts use this value. Work already running keeps the duration it started with."
                min={40}
                max={1200}
                step={10}
                unit="ms"
                value={controls.providerLatencyMs}
                onChange={(value) => patch({ providerLatencyMs: value })}
              />
            )}
            <Slider
              label="Retry limit"
              hint="Extra provider calls after the first attempt times out. Zero means payment makes one call and stops."
              min={0}
              max={6}
              step={1}
              unit="extra"
              value={controls.maxRetries}
              onChange={(value) => patch({ maxRetries: value })}
            />
            <Slider
              label="Attempt timeout"
              hint="Payment gives up on a provider attempt after this long. If the provider is still working, a retry starts only while the retry limit allows it."
              min={100}
              max={2000}
              step={20}
              unit="ms"
              value={controls.attemptTimeoutMs}
              onChange={(value) => patch({ attemptTimeoutMs: value })}
            />
            <Slider
              label="Client deadline"
              hint="The gateway returns a timeout if the checkout is still open after this long."
              min={400}
              max={3000}
              step={50}
              unit="ms"
              value={controls.clientDeadlineMs}
              onChange={(value) => patch({ clientDeadlineMs: value })}
            />
            <Toggle
              on={controls.cancelInFlight}
              onClick={() =>
                patch({ cancelInFlight: !controls.cancelInFlight })
              }
              label="Release the provider slot when the attempt times out"
            />
            <Toggle
              on={controls.propagateDeadline}
              onClick={() =>
                patch({ propagateDeadline: !controls.propagateDeadline })
              }
              label="Refuse a provider call that cannot finish before the client deadline"
            />
            <Toggle
              on={controls.shedAtInflight != null}
              onClick={() =>
                patch({
                  shedAtInflight: controls.shedAtInflight == null ? 12 : null,
                })
              }
              label="Shed a new checkout when too many are already open"
            />
            {controls.shedAtInflight != null ? (
              <Slider
                label="Open checkouts before shedding"
                hint="At this many open checkouts, the gateway rejects the new one and does not call checkout."
                min={1}
                max={24}
                step={1}
                unit="open"
                value={controls.shedAtInflight}
                onChange={(value) => patch({ shedAtInflight: value })}
              />
            ) : null}
          </div>
        </>
      }
      telemetry={
        <div>
          <div className="cascade-tabs" role="tablist" aria-label="Telemetry">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`telemetry-tab-${item.id}`}
                aria-controls="telemetry-panel"
                tabIndex={tab === item.id ? 0 : -1}
                aria-selected={tab === item.id}
                onKeyDown={(event) => {
                  const index = TABS.findIndex((entry) => entry.id === tab);
                  const next =
                    event.key === "ArrowRight"
                      ? (index + 1) % TABS.length
                      : event.key === "ArrowLeft"
                        ? (index + TABS.length - 1) % TABS.length
                        : event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? TABS.length - 1
                            : null;
                  if (next == null) return;
                  event.preventDefault();
                  setTab(TABS[next].id);
                  document
                    .getElementById(`telemetry-tab-${TABS[next].id}`)
                    ?.focus();
                }}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div
            className="mt-4"
            role="tabpanel"
            id="telemetry-panel"
            aria-labelledby={`telemetry-tab-${tab}`}
            tabIndex={0}
          >
            {view && tab === "metrics" ? <Metrics view={view} /> : null}
            {view && tab === "traces" ? (
              <Traces
                view={view}
                traceId={trace?.traceId ?? null}
                onInspect={setSelected}
                onSelect={(id) => {
                  setTraceId(id);
                  setPlaying(false);
                  if (engineRef.current) setSimFrozen(engineRef.current, true);
                }}
              />
            ) : null}
            {view && tab === "logs" ? (
              <>
                <div className="lab-log-filters">
                  <label>
                    Service
                    <select
                      value={logService}
                      onChange={(event) => setLogService(event.target.value)}
                    >
                      <option value="all">All services</option>
                      {SERVICES.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Event
                    <select
                      value={logKind}
                      onChange={(event) => setLogKind(event.target.value)}
                    >
                      {[
                        "all",
                        "start",
                        "end",
                        "retry",
                        "timeout",
                        "reject",
                        "cancel",
                        "queue",
                      ].map((kind) => (
                        <option key={kind} value={kind}>
                          {kind === "all" ? "All events" : kind}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Text or trace ID
                    <input
                      type="search"
                      value={logQuery}
                      onChange={(event) => setLogQuery(event.target.value)}
                      placeholder="e.g. tr-1 or timeout"
                    />
                  </label>
                </div>
                <p className="mb-3 text-xs text-[color:var(--exp-muted)]">
                  Plain, case-insensitive substring search. Up to 200 retained
                  events from the last 20 simulation seconds.
                </p>
                <LogList
                  rows={view.logs.filter(
                    (row) =>
                      (logService === "all" || row.service === logService) &&
                      (logKind === "all" || row.kind === logKind) &&
                      `${row.traceId} ${row.message}`
                        .toLowerCase()
                        .includes(logQuery.toLowerCase()),
                  )}
                  empty={
                    view.logs.length
                      ? "No events match these filters. Broaden the service, event or text filter."
                      : "No log events yet. Play or step the clock."
                  }
                />
              </>
            ) : null}
            {view && tab === "timeline" ? (
              <>
                <div className="lab-action-history">
                  <h3>Your operational decisions</h3>
                  {actions.length ? (
                    <ol>
                      {actions.map((action, index) => (
                        <li key={index}>
                          <time>{action.t.toFixed(2)}s</time>
                          <span>{action.label}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm">
                      Configuration changes appear here at their simulation
                      time.
                    </p>
                  )}
                </div>
                <h3 className="mb-3 text-sm font-medium">System events</h3>
                <LogList
                  rows={view.timeline}
                  empty="The timeline fills from the same events as the log."
                />
              </>
            ) : null}
            {!view ? (
              <p className="text-sm text-[color:var(--exp-muted)]">
                The clock has not started.
              </p>
            ) : null}
          </div>
          {grade && view ? (
            <section className="lab-review" aria-label="Incident review">
              <p className="exp-kicker">
                {grade.ok ? "Recovered" : "Investigation in progress"}
              </p>
              <h3>Evidence at {view.t.toFixed(1)} seconds</h3>
              <p>{grade.reason}</p>
              <dl>
                <div>
                  <dt>Finished / successful in 5s</dt>
                  <dd>
                    {view.finished} / {view.successes}
                  </dd>
                </div>
                <div>
                  <dt>Provider calls / checkout</dt>
                  <dd>{view.attemptsPerCheckout.toFixed(2)}</dd>
                </div>
                <div>
                  <dt>Checkout p99</dt>
                  <dd>
                    {view.finished
                      ? `${Math.round(view.gatewayP99Ms)} ms`
                      : "No samples"}
                  </dd>
                </div>
                <div>
                  <dt>Provider slots / queued</dt>
                  <dd>
                    {view.providerBusy} of {view.providerSlots} /{" "}
                    {view.providerQueue}
                  </dd>
                </div>
              </dl>
              <p>
                {actions.length} configuration changes. Last action:{" "}
                {actions.at(-1)?.label ?? "No configuration changes"}. The
                success population includes timeouts and rejected checkouts, so
                shedding cannot silently improve availability.
              </p>
              {notes ? (
                <p>
                  <strong>Your hypothesis:</strong> {notes}
                </p>
              ) : null}
              <p>
                Compare another approach by resetting the same seed. Replay
                experiment reconstructs this run from configuration timestamps;
                elapsed clock time and resulting evidence are reproduced.
              </p>
              <Link href="/sre-labs" className="product-text-link">
                Return to your learning path →
              </Link>
            </section>
          ) : null}
        </div>
      }
    />
  );
}

function Metrics({ view }: { view: CascadeView }) {
  const success =
    view.successRate == null
      ? "no finishes"
      : `${(view.successRate * 100).toFixed(1)}%`;
  return (
    <div className="cascade-metrics">
      <CascadeTrends samples={view.samples} />
      <dl>
        <Metric
          name="Checkout success"
          value={success}
          about="Finished checkouts that returned in time, divided by every checkout that finished, including timeouts and sheds."
        />
        <Metric
          name="Provider calls per checkout"
          value={view.attemptsPerCheckout.toFixed(2)}
          about="Provider spans on those finished checkouts, divided by the number of finished checkouts."
        />
        <Metric
          name="Provider slot use"
          value={`${Math.round(view.providerUtilization * 100)}%`}
          about={`Slots running provider work, divided by ${view.providerSlots}. This stays at or under 100%. Extra attempts wait in the queue.`}
        />
        <Metric
          name="Gateway p99"
          value={`${Math.round(view.gatewayP99Ms)} ms`}
          about="The slow end of checkout duration, from accept to the gateway result, over the same finished checkouts."
        />
        <Metric
          name="Successful arrivals"
          value={`${view.okPerSec.toFixed(1)} /s`}
          about={`Checkouts that returned in time, per second. The arrival rate is ${view.controls.arrivalRate} per second.`}
        />
        <Metric
          name="Measured provider work"
          value={
            view.measuredProviderMs == null
              ? "no samples"
              : `${Math.round(view.measuredProviderMs)} ms`
          }
          about="The middle of provider work durations started in this window."
        />
      </dl>
    </div>
  );
}

function Metric({
  name,
  value,
  about,
}: {
  name: string;
  value: string;
  about: string;
}) {
  return (
    <div>
      <dt>
        {name}
        <b>{value}</b>
      </dt>
      <dd>{about}</dd>
    </div>
  );
}

function Traces({
  view,
  traceId,
  onSelect,
  onInspect,
}: {
  view: CascadeView;
  traceId: string | null;
  onSelect: (id: string) => void;
  onInspect: (service: CascadeService) => void;
}) {
  const trace =
    view.traces.find((item) => item.traceId === traceId) ?? view.traces[0];
  if (!trace)
    return (
      <p className="text-sm text-[color:var(--exp-muted)]">
        No checkout has been accepted yet.
      </p>
    );
  const start = Math.min(...trace.spans.map((span) => span.start));
  const end = Math.max(
    ...trace.spans.map((span) => span.end ?? view.t),
    start + 0.05,
  );
  const spanWindow = Math.max(0.05, end - start);
  return (
    <div className="cascade-traces">
      <ul>
        {view.traces.map((item) => (
          <li key={item.traceId}>
            <button
              type="button"
              data-on={item.traceId === trace.traceId ? "true" : "false"}
              data-outcome={item.outcome}
              onClick={() => onSelect(item.traceId)}
            >
              <b>{item.traceId}</b>
              <span>{item.outcome}</span>
              <em>{item.providerAttempts}</em>
            </button>
          </li>
        ))}
      </ul>
      <ol
        className="cascade-waterfall"
        aria-label={`Spans for ${trace.traceId}`}
      >
        {trace.spans.map((span) => {
          const spanEnd = span.end ?? view.t;
          const left = ((span.start - start) / spanWindow) * 100;
          const width = Math.max(
            1.5,
            ((spanEnd - span.start) / spanWindow) * 100,
          );
          return (
            <li key={span.id}>
              <p>
                <button
                  type="button"
                  onClick={() => onInspect(span.service)}
                  title={`Inspect ${span.service}`}
                >
                  {span.service}
                </button>
                <span>
                  attempt {span.attempt} ·{" "}
                  {span.parentId ? `parent ${span.parentId}` : "root span"}
                </span>
              </p>
              <div className="cascade-track">
                <i
                  data-service={span.service}
                  data-status={span.status}
                  style={{
                    left: `${left}%`,
                    width: `${Math.min(100 - left, width)}%`,
                  }}
                />
              </div>
              <small>
                {span.status} · {Math.round((spanEnd - span.start) * 1000)} ms
                elapsed
                {span.workMs == null
                  ? ""
                  : ` · work ${Math.round(span.workMs)} ms`}
                {span.queueMs > 1
                  ? ` · queued ${Math.round(span.queueMs)} ms`
                  : ""}
              </small>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function LogList({ rows, empty }: { rows: CascadeLog[]; empty: string }) {
  if (rows.length === 0)
    return <p className="text-sm text-[color:var(--exp-muted)]">{empty}</p>;
  return (
    <ol className="cascade-log" tabIndex={0} aria-label="Retained system events">
      {rows.map((row, index) => (
        <li
          key={`${row.t}-${row.spanId}-${row.kind}-${index}`}
          data-service={row.service}
        >
          <time>{row.t.toFixed(2)}s</time>
          <div>
            <b>
              {row.traceId} · {row.service}
            </b>
            <p>{row.message}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Slider({
  label,
  hint,
  min,
  max,
  step,
  unit,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="cascade-slider">
      <span>
        <b>{label}</b>
        <strong>
          {value} {unit}
        </strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <small>{hint}</small>
    </label>
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
      className="cascade-switch"
      aria-pressed={on}
      onClick={onClick}
    >
      <span>{label}</span>
      <i data-on={on ? "true" : "false"} />
    </button>
  );
}

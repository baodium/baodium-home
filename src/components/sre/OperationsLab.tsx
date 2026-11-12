"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  ArrowRight,
  Layers3,
  Workflow,
} from "lucide-react";
import {
  advanceOperations,
  configureOperations,
  createOperations,
  gradeOperations,
  operationsWindow,
  type OperationsControls,
  type OperationsKind,
  type OperationsState,
} from "@/lib/sre/operations";
import { recordSreProgress } from "@/lib/sre/progress";
import { seriesPath } from "@/lib/sre/chart";

type Command =
  | { kind: "advance" }
  | { kind: "configure"; patch: Partial<OperationsControls> };
export function OperationsLab({ kind }: { kind: OperationsKind }) {
  const [state, setState] = useState(() => createOperations(kind));
  const [running, setRunning] = useState(false);
  const [grade, setGrade] = useState<{ ok: boolean; reason: string } | null>(
    null,
  );
  const [commands, setCommands] = useState<Command[]>([]);
  const [mode, setMode] = useState<"guided" | "practice" | "challenge">(
    "guided",
  );
  const current = useRef(state);
  const [panel, setPanel] = useState("metrics");
  const [mobileView, setMobileView] = useState("system");
  const capacity = kind === "capacity";
  useEffect(() => recordSreProgress(kind), [kind]);
  const publish = (next: OperationsState) => {
    current.current = next;
    setState(next);
  };
  const patch = (value: Partial<OperationsControls>) => {
    publish(configureOperations(current.current, value));
    setCommands((items) =>
      items.length < 500
        ? [...items, { kind: "configure", patch: value }]
        : items,
    );
    setGrade(null);
  };
  const advance = () => {
    publish(advanceOperations(current.current, 5));
    setCommands((items) =>
      items.length < 500 ? [...items, { kind: "advance" }] : items,
    );
    setGrade(null);
  };
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const next = advanceOperations(current.current, 5);
      current.current = next;
      setState(next);
      setCommands((items) =>
        items.length < 500 ? [...items, { kind: "advance" }] : items,
      );
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);
  const reset = (nextMode = mode) => {
    setRunning(false);
    setMode(nextMode);
    let next = createOperations(kind);
    if (nextMode === "challenge")
      next = configureOperations(
        next,
        capacity ? { arrivalRate: 600 } : { canaryPct: 50 },
      );
    publish(next);
    setCommands([]);
    setGrade(null);
  };
  const replay = () => {
    setRunning(false);
    let next = createOperations(kind);
    if (mode === "challenge")
      next = configureOperations(
        next,
        capacity ? { arrivalRate: 600 } : { canaryPct: 50 },
      );
    for (const command of commands)
      next =
        command.kind === "advance"
          ? advanceOperations(next, 5)
          : configureOperations(next, command.patch);
    publish(next);
    setGrade(null);
  };
  const check = () => {
    setRunning(false);
    const result = gradeOperations(current.current);
    setGrade(result);
    if (result.ok) recordSreProgress(kind, mode, result.reason);
  };
  const summary = operationsWindow(state);
  const recent = state.samples.at(-1);
  const rows = state.samples;
  const from = rows[0]?.t ?? 0,
    to = Math.max(from + 1, state.t);
  const x = (t: number) => 36 + ((t - from) / (to - from)) * 580;
  const y = (value: number) => 140 - value * 110;
  const change = (key: keyof OperationsControls, value: number) =>
    patch({ [key]: value });
  return (
    <div className="operations-lab" data-mobile-view={mobileView}>
      <header className="ops-mast">
        <div>
          <p className="product-eyebrow">
            SRE Lab /{" "}
            {capacity ? "Kubernetes autoscaling concepts" : "Deployment safety"}
          </p>
          <h1>
            {capacity
              ? "Hold checkout latency while the queue grows."
              : "Send a share of traffic to a faulty release and decide when to stop."}
          </h1>
          <p>
            {capacity
              ? "A traffic surge exceeds the worker capacity. Compare manual replicas with a utilization-based autoscaler, and recover without reducing demand."
              : "Send a controlled share of traffic to a faulty release. Read the customer impact, contain it, and decide when the rollout should stop."}
          </p>
        </div>
        <div className="ops-mode" role="group" aria-label="Learning mode">
          {(["guided", "practice", "challenge"] as const).map((item) => (
            <button
              key={item}
              aria-pressed={mode === item}
              onClick={() => reset(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </header>
      <div className="ops-transport">
        <span className="signal-label">
          {running ? "Running" : state.t ? "Paused" : "Ready"}
        </span>
        <output aria-label="Simulation clock">{state.t}s · seed 42</output>
        <button onClick={() => setRunning(!running)}>
          {running ? <Pause size={14} /> : <Play size={14} />}{" "}
          {running ? "Pause" : "Start"}
        </button>
        <button onClick={advance}>Step 5s</button>
        <button onClick={() => reset()}>
          <RotateCcw size={14} /> Reset
        </button>
        <button
          onClick={replay}
          disabled={!commands.length || commands.length >= 500}
        >
          Replay
        </button>
        <button
          className="product-button"
          onClick={() =>
            patch(capacity ? { arrivalRate: 600 } : { canaryPct: 50 })
          }
        >
          {capacity ? "Introduce traffic surge" : "Deploy canary to 50%"}
          <ArrowRight size={15} />
        </button>
        <button className="ops-assess" onClick={check}>
          Assess recovery
        </button>
        <span className="ops-execution">
          Browser model · 5× simulation time
        </span>
      </div>
      {grade ? (
        <p role="status" className={`ops-verdict ${grade.ok ? "is-ok" : ""}`}>
          {grade.reason}
          {grade.ok ? " Progress saved in this browser." : ""}
        </p>
      ) : null}
      <div className="ops-mobile-tabs" role="group" aria-label="Lab workspace">
        {["mission", "system", "policy"].map((view) => (
          <button
            key={view}
            aria-pressed={mobileView === view}
            onClick={() => setMobileView(view)}
          >
            {view}
          </button>
        ))}
      </div>
      {commands.length >= 500 ? (
        <p role="status">
          The 500-action recording limit is reached. Reset to record a new
          replay.
        </p>
      ) : null}
      <div className="ops-layout">
        <aside className="ops-mission">
          <p className="product-eyebrow">Your investigation</p>
          <h2>
            {capacity
              ? "Demand → queue → replicas"
              : "Observe → limit → recover"}
          </h2>
          {mode === "guided" ? (
            <ol>
              <li>Step the healthy service to establish a baseline.</li>
              <li>
                {capacity
                  ? "Introduce 600 requests/s and observe the queue and failures."
                  : "Deploy to 50% of traffic and observe failed requests."}
              </li>
              <li>
                {capacity
                  ? "Add replicas or enable autoscaling. Keep traffic at 500 requests/s or higher."
                  : "Roll back, or repair the release’s failure rate before increasing its exposure."}
              </li>
              <li>
                Recover five seconds with no failed requests, then assess the
                evidence.
              </li>
            </ol>
          ) : (
            <p>
              {capacity
                ? "Recover a surge of at least 500 requests/s. Keep the queue empty and finish five seconds without failures."
                : "Demonstrate the release’s failures, then recover five seconds without failed requests. More than one configuration can succeed."}
            </p>
          )}
          <Link href="/sre-labs" className="product-text-link">
            Back to the curriculum →
          </Link>
        </aside>
        <div className="ops-environment">
          <dl className="ops-metrics">
            <div>
              <dt>Successful completions · 5s</dt>
              <dd>
                {summary.success == null
                  ? "—"
                  : `${Math.round(summary.success * 100)}%`}
              </dd>
            </div>
            <div>
              <dt>Failed requests · 5s</dt>
              <dd>{summary.failed}</dd>
            </div>
            <div>
              <dt>{capacity ? "Queued requests" : "Canary exposure"}</dt>
              <dd>
                {capacity
                  ? (recent?.queued ?? 0)
                  : `${state.controls.canaryPct}%`}
              </dd>
            </div>
            <div>
              <dt>{capacity ? "Replicas" : "Offered requests /s"}</dt>
              <dd>
                {capacity
                  ? state.controls.replicas
                  : state.controls.arrivalRate}
              </dd>
            </div>
          </dl>
          <div
            className="ops-topology"
            aria-label={
              capacity
                ? "Traffic enters a bounded FIFO queue and is served by worker replicas"
                : "Traffic router sends requests to stable and canary releases"
            }
          >
            <div>
              <Workflow size={24} />
              <strong>{state.controls.arrivalRate} requests/s</strong>
              <span>Offered traffic</span>
            </div>
            <ArrowRight aria-hidden="true" />
            <div>
              <Layers3 size={24} />
              <strong>
                {capacity
                  ? `${recent?.queued ?? 0} queued`
                  : `${state.controls.canaryPct}% canary`}
              </strong>
              <span>
                {capacity
                  ? "FIFO · 500-request limit"
                  : "Weighted request routing"}
              </span>
            </div>
            <ArrowRight aria-hidden="true" />
            <div>
              <span className="ops-replica-grid">
                {Array.from(
                  { length: capacity ? state.controls.replicas : 2 },
                  (_, index) => (
                    <i
                      key={index}
                      data-fault={
                        !capacity &&
                        index === 1 &&
                        state.controls.releaseErrorPct > 0
                      }
                    />
                  ),
                )}
              </span>
              <strong>
                {capacity
                  ? `${state.controls.replicas * 100} requests/s`
                  : `${state.controls.releaseErrorPct}% canary faults`}
              </strong>
              <span>
                {capacity
                  ? "Configured service capacity"
                  : "Stable release is error-free"}
              </span>
            </div>
          </div>
          <div
            className="ops-evidence-tabs"
            role="group"
            aria-label="Evidence views"
          >
            {["metrics", "events", "model"].map((item) => (
              <button
                key={item}
                aria-pressed={panel === item}
                onClick={() => setPanel(item)}
              >
                {item}
              </button>
            ))}
          </div>
          {panel === "metrics" ? (
            <div className="ops-chart">
              <h3>{capacity ? "Worker utilization" : "Observed error rate"}</h3>
              <p>
                One-second samples · last 60 simulation seconds ·{" "}
                {capacity
                  ? "percentage of configured capacity used"
                  : "failed / completed requests"}
              </p>
              <svg
                role="img"
                aria-label={
                  capacity
                    ? "Worker utilization over simulation time"
                    : "Request error rate over simulation time"
                }
                viewBox="0 0 640 170"
              >
                {[0, 0.5, 1].map((mark) => (
                  <g key={mark}>
                    <line x1={36} x2={616} y1={y(mark)} y2={y(mark)} />
                    <text x={0} y={y(mark) + 4}>
                      {mark * 100}%
                    </text>
                  </g>
                ))}
                <path
                  d={seriesPath(
                    rows,
                    (row) =>
                      capacity
                        ? row.cpu
                        : row.failed / (row.failed + row.succeeded || 1),
                    x,
                    y,
                  )}
                />
                <text x={36} y={163}>
                  {from}s
                </text>
                <text x={616} y={163} textAnchor="end">
                  {state.t}s
                </text>
              </svg>
              <p>
                {summary.completed} completed requests: {summary.succeeded}{" "}
                successful, {summary.failed} failed. {summary.offered} offered
                in the last five seconds. Queued requests are not counted as
                completed.
              </p>
            </div>
          ) : panel === "events" ? (
            <ol className="ops-events">
              {state.events.length ? (
                state.events.map((event, index) => (
                  <li key={index}>
                    <time>{event.t}s</time>
                    <span>{event.message}</span>
                  </li>
                ))
              ) : (
                <li>
                  No interventions or failures yet. Step the clock, then
                  introduce a change.
                </li>
              )}
            </ol>
          ) : (
            <div className="ops-model">
              <h3>What this model includes</h3>
              <p>
                {capacity
                  ? "A bounded FIFO queue, 100 requests/s of capacity per replica, a three-second queue deadline, and rejected arrivals when the 500-request queue is full. The controller checks every five seconds and scales up using ceil(current replicas × observed utilization / target), with a 10% tolerance and a maximum of 12 replicas. Replicas become ready immediately. It does not model startup latency, downscaling or a real Kubernetes cluster."
                  : "Seeded individual request assignment to stable and canary versions. Stable requests always succeed; each canary request independently fails with the configured probability. It does not model request latency or a real deployment platform."}
              </p>
              <p>
                Every metric and assessment comes from the same request
                accounting. Replay repeats your configuration changes and clock
                steps with seed 42.
              </p>
              {capacity ? (
                <a
                  href="https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Read the Kubernetes HPA algorithm ↗
                </a>
              ) : null}
            </div>
          )}
        </div>
        <aside className="ops-controls">
          <p className="product-eyebrow">Configuration</p>
          <h2>{capacity ? "Capacity policy" : "Rollout policy"}</h2>
          <label>
            Offered traffic{" "}
            <output>{state.controls.arrivalRate} requests/s</output>
            <input
              aria-label="Offered traffic"
              type="range"
              min={20}
              max={1000}
              step={20}
              value={state.controls.arrivalRate}
              onChange={(event) =>
                change("arrivalRate", Number(event.target.value))
              }
            />
          </label>
          {capacity ? (
            <>
              <label>
                Worker replicas <output>{state.controls.replicas}</output>
                <input
                  aria-label="Worker replicas"
                  type="range"
                  min={1}
                  max={12}
                  value={state.controls.replicas}
                  onChange={(event) =>
                    change("replicas", Number(event.target.value))
                  }
                />
              </label>
              <button
                className="ops-toggle"
                aria-pressed={state.controls.autoscale}
                onClick={() => patch({ autoscale: !state.controls.autoscale })}
              >
                Autoscaling{" "}
                <strong>{state.controls.autoscale ? "On" : "Off"}</strong>
              </button>
              <label>
                Utilization target{" "}
                <output>{Math.round(state.controls.cpuTarget * 100)}%</output>
                <input
                  aria-label="Utilization target"
                  type="range"
                  min={0.3}
                  max={0.9}
                  step={0.05}
                  value={state.controls.cpuTarget}
                  onChange={(event) =>
                    change("cpuTarget", Number(event.target.value))
                  }
                />
              </label>
              <p>
                Each replica has 100 requests/s of simulated capacity. A
                scale-up decision takes effect at the next five-second
                controller check.
              </p>
            </>
          ) : (
            <>
              <label>
                Canary exposure <output>{state.controls.canaryPct}%</output>
                <input
                  aria-label="Canary exposure"
                  type="range"
                  min={0}
                  max={100}
                  value={state.controls.canaryPct}
                  onChange={(event) =>
                    change("canaryPct", Number(event.target.value))
                  }
                />
              </label>
              <label>
                Canary failure probability{" "}
                <output>{state.controls.releaseErrorPct}%</output>
                <input
                  aria-label="Canary failure probability"
                  type="range"
                  min={0}
                  max={100}
                  value={state.controls.releaseErrorPct}
                  onChange={(event) =>
                    change("releaseErrorPct", Number(event.target.value))
                  }
                />
              </label>
              <button
                className="product-button"
                onClick={() => patch({ canaryPct: 0 })}
              >
                Roll back to stable
              </button>
              <p>
                Lowering exposure limits impact. A repaired release can also
                pass; rollback is not the only valid outcome.
              </p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

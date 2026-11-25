"use client";

import { useEffect, useState } from "react";
import { ChapterPlate } from "@/components/learning/ChapterPlate";
import { LearningWorkbench } from "@/components/learning/LearningWorkbench";
import { IdempotencyGraph } from "@/components/experience/IdempotencyGraph";
import { RunningCode } from "@/components/experience/RunningCode";
import { chapter3Program } from "@/lib/experience/running-code";
import { SimControls } from "@/components/experience/SimControls";
import { Segmented } from "@/components/ui/Segmented";
import {
  SLOW_PROVIDER_MS,
  createIdempotencyEngine,
  idempotencySnapshot,
  setIdempotencyControls,
  setIdempotencyFrozen,
  stepIdempotency,
  tickIdempotency,
  traceIdempotency,
  type IdempotencyEngine,
  type IdempotencyMode,
  type IdempotencySnapshot,
} from "@/lib/experience/idempotency/engine";
import { readIdempotency, type IdempotencyReadout } from "@/lib/experience/idempotency/readout";
import { chapter3Copy, chapter3Steps, type Chapter3StepId } from "@/lib/experience/scenarios/chapter-3";
import { LessonPlace } from "@/components/learning/LessonCraft";
import { LessonSteps } from "@/components/learning/LessonSteps";
import Link from "next/link";
import { markChapterFinished, markChapterOpened } from "@/lib/learning/directory-progress";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

function canContinue(step: Chapter3StepId, read: IdempotencyReadout) {
  switch (step) {
    case "inspect":
      return read.tracedId != null;
    case "fit":
      return read.cleanFits >= 1;
    case "slow":
      return read.providerSlow && read.timedOut;
    case "duplicate":
      return read.duplicated;
    case "decide":
      return read.controls.reuseOperationId;
    case "identity":
      return read.identified;
    case "record":
      return read.recorded;
    case "review":
      return true;
    default:
      return false;
  }
}

type Session = { engine: IdempotencyEngine; snap: IdempotencySnapshot };

export function Chapter3Experience() {
  const reduced = usePrefersReducedMotion();
  const [seed] = useState(3);
  const [mode, setMode] = useState<IdempotencyMode>("guided");
  const [stepId, setStepId] = useState<Chapter3StepId>("inspect");
  const [decided, setDecided] = useState(false);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [session, setSession] = useState<Session>(() => {
    const engine = createIdempotencyEngine({ seed: 3, mode: "guided" });
    return { engine, snap: idempotencySnapshot(engine) };
  });
  const { snap } = session;

  function apply(fn: (engine: IdempotencyEngine) => IdempotencySnapshot) {
    setSession((current) => ({ engine: current.engine, snap: fn(current.engine) }));
  }

  const read = readIdempotency(snap);
  const stepIndex = chapter3Steps.findIndex((step) => step.id === stepId);
  const step = chapter3Steps[stepIndex] ?? chapter3Steps[0];
  const openModes = decided || mode !== "guided";

  useEffect(() => {
    markChapterOpened("chapter-3");
  }, []);

  useEffect(() => {
    if (stepId === "review" || read.challengePassed) markChapterFinished("chapter-3");
  }, [stepId, read.challengePassed]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSession((current) => {
        let next = current.engine.cached;
        const steps = Math.max(1, Math.round(speed));
        for (let i = 0; i < steps; i += 1) next = tickIdempotency(current.engine, 50);
        return { engine: current.engine, snap: next };
      });
    }, 50);
    return () => window.clearInterval(id);
  }, [running, speed]);

  function rebuild(nextMode: IdempotencyMode) {
    const engine = createIdempotencyEngine({ seed, mode: nextMode });
    setSession({ engine, snap: idempotencySnapshot(engine) });
    setMode(nextMode);
    setRunning(true);
    if (nextMode === "guided") {
      setStepId("inspect");
      setDecided(false);
    }
  }

  function follow() {
    apply((engine) =>
      engine.checkoutsSent < 1 ? engine.cached : traceIdempotency(engine, engine.checkoutsSent),
    );
  }

  return (
    <div className="mx-auto w-full max-w-[88rem] px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0 max-w-3xl flex-1">
          <LessonPlace course="Book labs" index={2} total={2} minutes={15} />
          <p className="mt-1 text-[1.05rem] leading-relaxed text-[color:var(--exp-fg)]">
            Chapter 3, a late charge.
          </p>
          <h1 className="lab-title mt-3 max-w-[16em] text-[clamp(2.15rem,3.4vw,3.05rem)] leading-[1.22] tracking-[-0.02em] text-[color:var(--exp-fg)]">
            {chapter3Copy.h1}
          </h1>
          <LessonSteps
            beats={[
              {
                title: "The client stopped waiting",
                body: "The provider may still settle the charge. The timeout is not the provider’s outcome.",
              },
              {
                title: "The retry went out with a new operation id",
                body: "That settlement is a second charge. The first timeout stays unresolved.",
              },
              {
                title: "The receipt belongs with the charge",
                body: "Written later, the charge can exist with no proof the customer was told.",
              },
            ]}
          />
        </div>
        <ChapterPlate chapter={3} sizes="200px" className="hidden h-28 w-44 sm:block" />
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented<IdempotencyMode>
            label="Lab mode"
            layoutId="ch3-mode"
            value={mode}
            onChange={(id) => {
              if (id === mode) return;
              rebuild(id);
            }}
            options={[
              {
                id: "guided",
                label: "Guided",
                title: "In Guided, you finish the current step before the next one opens.",
              },
              {
                id: "practice",
                label: "Practice",
                disabled: !openModes && mode === "guided",
                title: openModes
                  ? "In Practice, the controls stay open after you have seen the incident once."
                  : "Choose the identity on the retry first.",
              },
              {
                id: "challenge",
                label: "Challenge",
                disabled: !openModes && mode === "guided",
                title: openModes
                  ? "Challenge starts mid-incident. The prompt does not name the fix. A pass comes from the numbers."
                  : "Choose the identity on the retry first.",
              },
            ]}
          />
          <SimControls
            running={running}
            speed={speed}
            logicalTimeSec={read.clock / 1000}
            seed={read.seed}
            onPlayPause={() => {
              setRunning((value) => !value);
              apply((engine) => setIdempotencyFrozen(engine, running));
            }}
            onStep={() => {
              apply((engine) => stepIdempotency(engine));
            }}
            onReplay={() => rebuild(mode)}
            onSpeed={setSpeed}
            reducedMotion={reduced}
          />
        </div>
      </div>

      <LearningWorkbench
        className="!mt-5"
        canvas={
          <>
            <IdempotencyGraph read={read} reducedMotion={reduced} />
            <RunningCode
              program={chapter3Program({
                reuse: read.controls.reuseOperationId,
                outbox: read.controls.outbox,
                timeoutMs: read.controls.timeoutMs,
                providerMs: read.controls.providerMs,
                unique: read.uniqueCharges,
                duplicate: read.duplicateCharges,
                unresolved: read.unresolved,
                lost: read.lostNotifications,
                elapsed: read.checkoutsSent,
                reduced,
                lockTimes: mode === "challenge",
              })}
              onEdit={(id, value) => {
                if (id === "reuseOperationId") setDecided(true);
                apply((engine) =>
                  setIdempotencyControls(engine, {
                    [id]: value,
                  }),
                );
              }}
            />
            <section className="exp-panel" aria-label="Live metrics">
              <h2 className="font-serif text-lg text-[color:var(--exp-fg)]">Live metrics</h2>
              <p className="mt-1 text-sm leading-relaxed text-[color:var(--exp-fg)]">{read.narration}</p>
              <dl className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
                <Metric label="Checkouts sent" value={read.checkoutsSent} />
                <Metric label="Unique charges" value={read.uniqueCharges} />
                <Metric label="Duplicate charges" value={read.duplicateCharges} />
                <Metric label="Unresolved" value={read.unresolved} />
                <Metric label="Lost notifications" value={read.lostNotifications} />
                <Metric label="Clean streak" value={read.cleanStreak} />
              </dl>
            </section>
            <Ledger read={read} />
          </>
        }
        rail={
          <>
            {mode === "guided" ? (
              <section className="exp-panel" aria-label={step.title}>
                <p className="text-[1.05rem] font-semibold text-[color:var(--exp-fg)]">
                  Step {stepIndex + 1} of {chapter3Steps.length}
                </p>
                <h2 className="lesson-rail-title">{step.title}</h2>
                <p className="mt-2 text-[1.02rem] leading-relaxed text-[color:var(--exp-fg)]">{step.body}</p>
                {stepId === "inspect" ? (
                  <button type="button" className="exp-btn exp-btn-primary mt-4" onClick={follow} disabled={read.checkoutsSent < 1}>
                    Follow this checkout
                  </button>
                ) : null}
                {stepId === "slow" ? (
                  <button
                    type="button"
                    className="exp-btn exp-btn-primary mt-4"
                    onClick={() => {
                      apply((engine) => setIdempotencyControls(engine, { providerMs: SLOW_PROVIDER_MS }));
                    }}
                  >
                    Slow the provider
                  </button>
                ) : null}
                {stepId === "decide" ? (
                  <div className="mt-4 flex flex-col gap-2">
                    <button
                      type="button"
                      className={`exp-btn w-full justify-start ${read.controls.reuseOperationId ? "exp-btn-primary" : "exp-btn-ghost"}`}
                      onClick={() => {
                        setDecided(true);
                        apply((engine) => setIdempotencyControls(engine, { reuseOperationId: true }));
                      }}
                    >
                      Reuse the operation id
                    </button>
                    <button
                      type="button"
                      className={`exp-btn w-full justify-start ${read.controls.reuseOperationId ? "exp-btn-ghost" : "exp-btn-primary"}`}
                      onClick={() => {
                        apply((engine) => setIdempotencyControls(engine, { reuseOperationId: false }));
                      }}
                    >
                      Leave a new id on the retry
                    </button>
                  </div>
                ) : null}
                {stepId === "record" ? (
                  <button
                    type="button"
                    className="exp-btn exp-btn-primary mt-4"
                    onClick={() => {
                      apply((engine) => setIdempotencyControls(engine, { outbox: true }));
                    }}
                  >
                    Write the notification with the charge
                  </button>
                ) : null}
                {stepId === "review" ? (
                  <div className="mt-4 space-y-3 text-sm leading-relaxed text-[color:var(--exp-fg)]">
                    {chapter3Copy.review.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                ) : null}
                <button
                  type="button"
                  className="exp-btn exp-btn-solid mt-5"
                  disabled={!canContinue(stepId, read)}
                  onClick={() => {
                    if (stepId === "review") {
                      setDecided(true);
                      rebuild("practice");
                      return;
                    }
                    const next = chapter3Steps[stepIndex + 1];
                    if (next) setStepId(next.id);
                  }}
                >
                  {stepId === "review" ? "Open practice" : "Continue"}
                </button>
              </section>
            ) : mode === "challenge" ? (
              <section className="exp-panel">
                <p className="text-[1.05rem] font-semibold text-[color:var(--exp-fg)]">Challenge</p>
                <h2 className="lesson-rail-title">{chapter3Copy.challenge.title}</h2>
                <p className="mt-2 text-[1.02rem] leading-relaxed text-[color:var(--exp-fg)]">{chapter3Copy.challenge.situation}</p>
                <p className="mt-3 text-[1.02rem] leading-relaxed text-[color:var(--exp-fg)]">{chapter3Copy.challenge.objective}</p>
                <p className="mt-3 text-sm leading-relaxed text-[color:var(--exp-fg)]">
                  {read.challengePassed
                    ? `Passed. Clean streak ${read.cleanStreak}.`
                    : read.challengeFailed
                      ? `Time ran out. Clean streak ${read.cleanStreak} of ${read.window}.`
                      : `${(read.remainingMs / 1000).toFixed(1)} seconds left. Clean streak ${read.cleanStreak} of ${read.window}.`}
                </p>
              </section>
            ) : (
              <ControlsPanel
                mode={mode}
                read={read}
                onChange={(patch) => {
                  if (patch.reuseOperationId) setDecided(true);
                  apply((engine) => setIdempotencyControls(engine, patch));
                }}
              />
            )}
            <p className="text-sm leading-relaxed text-[color:var(--exp-fg)]">{chapter3Copy.approximation}</p>
          </>
        }
      />
      <LessonSteps
        label="After the lesson"
        beats={[
          ...chapter3Copy.review.map((title) => ({ title, body: "" })),
          {
            title: "What did the client know at the timeout, and what did the provider still do after that?",
            body: "",
          },
          {
            title: "Which retry created the second charge, and what was different about its operation id?",
            body: "",
          },
        ]}
      />
      <p className="lesson-next">
        <Link href="/sre-labs/instrument">Which call made playback slow</Link>
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="instrument">
      <dt className="instrument-label">{label}</dt>
      <dd className="mt-2 tabular-nums text-[color:var(--exp-fg)]">{value}</dd>
    </div>
  );
}

function Ledger({ read }: { read: IdempotencyReadout }) {
  const rows = read.ledger.slice(-6);
  return (
    <section className="exp-panel overflow-x-auto">
      <h2 className="font-serif text-lg text-[color:var(--exp-fg)]">Ledger</h2>
      <p className="mt-1 text-sm leading-relaxed text-[color:var(--exp-muted)]">
        Recent checkouts. The totals above are the whole run, and the challenge scores the clean streak.
      </p>
      <table className="mt-4 w-full min-w-[36rem] text-left text-sm">
        <caption className="sr-only">Recent checkouts from this run</caption>
        <thead className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-[color:var(--exp-faint)]">
          <tr>
            <th className="py-2 pr-3 font-normal">Checkout</th>
            <th className="py-2 pr-3 font-normal">Operation</th>
            <th className="py-2 pr-3 font-normal">Charges</th>
            <th className="py-2 pr-3 font-normal">Client</th>
            <th className="py-2 font-normal">Notification</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-3 text-[color:var(--exp-muted)]">
                No checkout has been sent.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                className="border-t border-[color:var(--exp-line)]"
                data-traced={row.id === read.tracedId ? "true" : "false"}
              >
                <th className="py-2 pr-3 font-normal tabular-nums text-[color:var(--exp-fg)]">{row.id}</th>
                <td className="py-2 pr-3 font-mono text-xs text-[color:var(--exp-muted)]" title={row.operationIds.join(", ")}>
                  {row.operationIds.map((id) => id.replace(/^s\d+-/, "")).join(", ") || "pending"}
                </td>
                <td className="py-2 pr-3 tabular-nums">{row.charges}</td>
                <td className="py-2 pr-3">{row.client}</td>
                <td className="py-2">{row.notification}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}

function ControlsPanel({
  mode,
  read,
  onChange,
}: {
  mode: IdempotencyMode;
  read: IdempotencyReadout;
  onChange: (patch: Partial<IdempotencyReadout["controls"]>) => void;
}) {
  const locked = mode === "challenge";
  return (
    <section className="exp-panel" aria-label="Adjust your settings">
      <h2 className="font-serif text-lg text-[color:var(--exp-fg)]">Adjust your settings</h2>
      <div className="mt-4 space-y-4">
        <label className="block text-sm">
          <span className="flex items-baseline justify-between gap-3">
            <span>Provider time</span>
            <span className="tabular-nums text-[color:var(--exp-faint)]">{read.controls.providerMs} ms</span>
          </span>
          {locked ? (
            <p className="mt-1 leading-relaxed text-[color:var(--exp-muted)]">Fixed for this run.</p>
          ) : (
            <input
              className="mt-2 w-full"
              type="range"
              min={200}
              max={3000}
              step={50}
              value={read.controls.providerMs}
              aria-label="Provider time"
              onChange={(event) => onChange({ providerMs: Number(event.target.value) })}
            />
          )}
          <span className="mt-1 block leading-relaxed text-[color:var(--exp-muted)]">
            How long a new charge takes to settle. A checkout already sent keeps the time it started with.
          </span>
        </label>
        <label className="block text-sm">
          <span className="flex items-baseline justify-between gap-3">
            <span>Client timeout</span>
            <span className="tabular-nums text-[color:var(--exp-faint)]">{read.controls.timeoutMs} ms</span>
          </span>
          {locked ? (
            <p className="mt-1 leading-relaxed text-[color:var(--exp-muted)]">Fixed for this run.</p>
          ) : (
            <input
              className="mt-2 w-full"
              type="range"
              min={200}
              max={2000}
              step={50}
              value={read.controls.timeoutMs}
              aria-label="Client timeout"
              onChange={(event) => onChange({ timeoutMs: Number(event.target.value) })}
            />
          )}
          <span className="mt-1 block leading-relaxed text-[color:var(--exp-muted)]">
            How long the client waits before it treats the outcome as unknown.
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={read.controls.reuseOperationId}
            onChange={(event) => onChange({ reuseOperationId: event.target.checked })}
          />
          <span>
            <span className="text-[color:var(--exp-fg)]">Reuse the operation id</span>
            <span className="mt-1 block leading-relaxed text-[color:var(--exp-muted)]">
              A retry that has not left yet carries the original id, and the provider returns the stored charge. A retry already sent keeps the id it left with.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={read.controls.outbox}
            onChange={(event) => onChange({ outbox: event.target.checked })}
          />
          <span>
            <span className="text-[color:var(--exp-fg)]">Write the notification with the charge</span>
            <span className="mt-1 block leading-relaxed text-[color:var(--exp-muted)]">
              The notification is chosen when the charge is created. A charge already on the ledger keeps the one it has.
            </span>
          </span>
        </label>
      </div>
    </section>
  );
}

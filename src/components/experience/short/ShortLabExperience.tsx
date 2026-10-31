"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LearningWorkbench } from "@/components/learning/LearningWorkbench";
import { ConceptGraph } from "@/components/experience/short/ConceptGraph";
import { ShortSeriesChart } from "@/components/experience/short/ShortSeriesChart";
import { controlsFor, getShortLab } from "@/lib/experience/short-labs/catalog";
import type { ControlValues, LabControl, LabMode } from "@/lib/experience/short-labs/types";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";
import { Segmented } from "@/components/ui/Segmented";

const DT = 0.25;

function formatControl(control: LabControl, value: number | boolean | string): string {
  if (control.kind === "toggle") return value === true ? "On" : "Off";
  if (control.kind === "choice") {
    return control.options.find((option) => option.value === value)?.label ?? String(value);
  }
  const digits = control.digits ?? (control.step < 1 ? 1 : 0);
  return `${Number(value).toFixed(digits)} ${control.unit}`.trim();
}

function formatMetric(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return "n/a";
  return value.toFixed(digits);
}

export function ShortLabExperience({ slug }: { slug: string }) {
  const lab = getShortLab(slug);
  if (!lab) throw new Error(`Unknown lab ${slug}`);
  return <ShortLabSession lab={lab} />;
}

function ShortLabSession({ lab }: { lab: NonNullable<ReturnType<typeof getShortLab>> }) {
  const reduced = usePrefersReducedMotion();
  const [mode, setMode] = useState<LabMode>("guided");
  const [running, setRunning] = useState(true);
  const [stageIndex, setStageIndex] = useState(0);
  const [controls, setControls] = useState<ControlValues>(() => controlsFor(lab, "guided"));
  const [snap, setSnap] = useState(() => lab.sim.step(null, controlsFor(lab, "guided"), DT));
  const controlsRef = useRef(controls);
  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  useEffect(() => {
    if (!running || reduced) return;
    const id = window.setInterval(() => {
      setSnap((prev) => lab.sim.step(prev, controlsRef.current, DT));
    }, 250);
    return () => window.clearInterval(id);
  }, [running, reduced, lab]);

  function applyMode(next: LabMode) {
    const nextControls = controlsFor(lab, next);
    setMode(next);
    setControls(nextControls);
    setStageIndex(0);
    setSnap(lab.sim.step(null, nextControls, DT));
    setRunning(next !== "challenge");
  }

  function reset() {
    const nextControls = controlsFor(lab, mode);
    setControls(nextControls);
    setStageIndex(0);
    setSnap(lab.sim.step(null, nextControls, DT));
    setRunning(mode !== "challenge");
  }

  function advance(seconds: number) {
    setSnap((prev) => {
      let cursor = prev;
      const ticks = Math.max(1, Math.round(seconds / DT));
      for (let i = 0; i < ticks; i += 1) {
        cursor = lab.sim.step(cursor, controlsRef.current, DT);
      }
      return cursor;
    });
  }

  function updateControl(id: string, value: number | boolean | string) {
    if (mode === "challenge" && id in lab.sim.challengeLocks) return;
    setControls((current) => ({ ...current, [id]: value }));
  }

  const stage = lab.stages[stageIndex];
  const stageOpen = stage ? snap.gates[stage.gate] === true : false;
  const guidedDone = mode === "guided" && stageIndex >= lab.stages.length;
  const situation = mode === "challenge" ? [lab.challengeSituation] : lab.situation;
  const objective = mode === "challenge" ? lab.challengeObjective : lab.objective;

  return (
    <div className="relative mx-auto w-full max-w-[88rem] px-4 py-4 sm:px-6 sm:py-5" data-lab={lab.slug}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <p className="exp-kicker">Labs / Chapter {lab.number}</p>
          <h1 className="mt-2 font-serif text-[clamp(1.85rem,4vw,2.7rem)] leading-[1.08] tracking-[-0.03em] text-[color:var(--exp-fg)]">
            {lab.h1}
          </h1>
          <p className="mt-3 max-w-2xl text-[1.02rem] leading-relaxed text-[color:var(--exp-muted)]">
            {lab.gettingStarted}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented<LabMode>
            label="Lab mode"
            layoutId={`short-lab-mode-${lab.slug}`}
            value={mode}
            onChange={applyMode}
            options={[
              { id: "guided", label: "Guided" },
              { id: "practice", label: "Practice" },
              { id: "challenge", label: "Challenge" },
            ]}
          />
        </div>
      </header>

      <LearningWorkbench
        canvas={
          <>
            <div className="exp-panel !p-0 overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[color:var(--exp-line)] px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <h2 className="font-serif text-lg text-[color:var(--exp-fg)]">The system</h2>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[color:var(--exp-muted)]">{snap.narration}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {reduced ? (
                    <button type="button" className="exp-btn exp-btn-primary !min-h-9" onClick={() => advance(1)}>
                      Advance 1s
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="exp-btn exp-btn-primary !min-h-9"
                      onClick={() => setRunning((value) => !value)}
                    >
                      {running ? "Pause" : "Run"}
                    </button>
                  )}
                  <button type="button" className="exp-btn exp-btn-ghost !min-h-9" onClick={reset}>
                    Reset
                  </button>
                </div>
              </div>
              <ConceptGraph lab={lab} snap={snap} reducedMotion={reduced} />
            </div>
            <ShortSeriesChart
              title={lab.chart.title}
              caption={lab.chart.caption}
              yUnit={lab.chart.yUnit}
              series={lab.chart.series}
              points={snap.series}
              guide={lab.chart.guide}
            />
            {mode === "challenge" ? (
              <div
                className="exp-panel"
                role="status"
                data-challenge={snap.challengePassed ? "pass" : "open"}
              >
                <h2 className="font-serif text-lg text-[color:var(--exp-fg)]">
                  {snap.challengePassed ? "This wave meets the objective." : "The wave is still open."}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--exp-muted)]">{lab.challengeSuccess}</p>
                <p className="mt-2 font-mono text-[0.78rem] tabular-nums text-[color:var(--exp-fg)]">{snap.challengeDetail}</p>
              </div>
            ) : null}
          </>
        }
        rail={
          <>
            <section className="exp-panel">
              <h2 className="font-serif text-lg text-[color:var(--exp-fg)]">Your objective</h2>
              <p className="mt-2 text-sm leading-relaxed text-[color:var(--exp-muted)]">{objective}</p>
              {situation.map((paragraph) => (
                <p key={paragraph.slice(0, 24)} className="mt-3 text-sm leading-relaxed text-[color:var(--exp-muted)]">
                  {paragraph}
                </p>
              ))}
              {mode !== "challenge" ? (
                <dl className="mt-4 space-y-2">
                  {lab.terms.map((term) => (
                    <div key={term.term}>
                      <dt className="text-sm font-medium text-[color:var(--exp-fg)]">{term.term}</dt>
                      <dd className="text-sm leading-relaxed text-[color:var(--exp-muted)]">{term.explain}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              <p className="mt-4 text-[0.78rem] leading-relaxed text-[color:var(--exp-faint)]">
                {lab.explore.join(" · ")}
              </p>
            </section>

            {mode === "guided" && stage ? (
              <section className="exp-panel" aria-live="polite">
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-[color:var(--exp-faint)]">
                  {stage.letter} of {lab.stages[lab.stages.length - 1]?.letter}
                </p>
                <h2 className="mt-1 font-serif text-lg text-[color:var(--exp-fg)]">{stage.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--exp-muted)]">{stage.body}</p>
                <button
                  type="button"
                  className="exp-btn exp-btn-primary mt-4 !min-h-10"
                  disabled={!stageOpen}
                  onClick={() => setStageIndex((index) => index + 1)}
                >
                  {stageOpen ? "Continue" : "Not yet"}
                </button>
              </section>
            ) : null}

            {guidedDone ? (
              <section className="exp-panel">
                <h2 className="font-serif text-lg text-[color:var(--exp-fg)]">Something to keep in mind</h2>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--exp-muted)]">{lab.keepInMind}</p>
                <button type="button" className="exp-btn exp-btn-ghost mt-4 !min-h-10" onClick={() => applyMode("practice")}>
                  Practice with the controls
                </button>
              </section>
            ) : null}

            <section className="exp-panel" aria-label="Live metrics">
              <h2 className="font-serif text-lg text-[color:var(--exp-fg)]">Live metrics</h2>
              <table className="mt-3 w-full text-left text-sm">
                <tbody>
                  {lab.metrics.map((metric) => (
                    <tr key={metric.id} className="border-t border-[color:var(--exp-line)]">
                      <th scope="row" className="py-2 pr-3 align-top font-medium text-[color:var(--exp-fg)]">
                        {metric.label}
                        <span className="mt-0.5 block text-[0.78rem] font-normal leading-snug text-[color:var(--exp-muted)]">
                          {metric.explain}
                        </span>
                      </th>
                      <td className="py-2 text-right align-top font-mono tabular-nums text-[color:var(--exp-fg)]">
                        {formatMetric(snap.metrics[metric.id] ?? 0, metric.digits)}
                        {metric.unit ? ` ${metric.unit}` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="exp-panel">
              <h2 className="font-serif text-lg text-[color:var(--exp-fg)]">Adjust your settings</h2>
              <div className="mt-3 space-y-5">
                {lab.controls.map((control) => {
                  const locked = mode === "challenge" && control.id in lab.sim.challengeLocks;
                  const value = controls[control.id];
                  return (
                    <div key={control.id}>
                      <div className="flex items-baseline justify-between gap-3">
                        <label htmlFor={`${lab.slug}-${control.id}`} className="text-sm font-medium text-[color:var(--exp-fg)]">
                          {control.label}
                        </label>
                        <span className="font-mono text-[0.75rem] tabular-nums text-[color:var(--exp-fg)]">
                          {formatControl(control, value ?? "")}
                          {locked ? " · fixed" : ""}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-[color:var(--exp-muted)]">{control.explain}</p>
                      {control.kind === "range" ? (
                        <input
                          id={`${lab.slug}-${control.id}`}
                          className="mt-2 w-full accent-[color:var(--exp-signal)] disabled:opacity-40"
                          type="range"
                          min={control.min}
                          max={control.max}
                          step={control.step}
                          disabled={locked}
                          value={Number(value)}
                          onChange={(event) => updateControl(control.id, Number(event.target.value))}
                        />
                      ) : null}
                      {control.kind === "toggle" ? (
                        <button
                          id={`${lab.slug}-${control.id}`}
                          type="button"
                          disabled={locked}
                          aria-pressed={value === true}
                          onClick={() => updateControl(control.id, value !== true)}
                          className="exp-btn exp-btn-ghost mt-2 !min-h-9 disabled:opacity-40"
                        >
                          {value === true ? "On" : "Off"}
                        </button>
                      ) : null}
                      {control.kind === "choice" ? (
                        <div id={`${lab.slug}-${control.id}`} className="mt-2 grid gap-1.5" role="radiogroup" aria-label={control.label}>
                          {control.options.map((option) => {
                            const selected = value === option.value;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                disabled={locked}
                                onClick={() => updateControl(control.id, option.value)}
                                className={`min-h-9 rounded-full border px-3 text-left text-sm disabled:opacity-40 ${
                                  selected
                                    ? "border-[color:var(--exp-fg)] text-[color:var(--exp-fg)]"
                                    : "border-[color:var(--exp-line)] text-[color:var(--exp-muted)]"
                                }`}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>

            {mode === "practice" ? (
              <section className="exp-panel">
                <h2 className="font-serif text-lg text-[color:var(--exp-fg)]">Something to keep in mind</h2>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--exp-muted)]">{lab.keepInMind}</p>
              </section>
            ) : null}

            <p className="px-1 text-sm text-[color:var(--exp-muted)]">
              <Link href={lab.slug === "chapter-1" ? "/system-design/chapter-1" : `/system-design/${lab.slug}`} className="underline decoration-[color:var(--exp-line-strong)] underline-offset-4 hover:text-[color:var(--exp-fg)]">
                Read chapter {lab.number}
              </Link>
            </p>
          </>
        }
      />
    </div>
  );
}

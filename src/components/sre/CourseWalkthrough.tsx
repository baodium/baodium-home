"use client";

import { useEffect, useRef, useState } from "react";
import type { CourseLesson } from "@/lib/sre/observability-course";
import { readStored, writeStored } from "@/lib/storage";
import { CourseCommand } from "./CourseCommand";

type Evidence = { checkedAt: string; checks: string[] };

/** Imported reports are learner-held evidence, not signed attestations or live health. */
function parseEvidence(value: unknown, checkpoint: string): Evidence {
  if (!value || typeof value !== "object") throw new Error("Choose a JSON checkpoint report from the lab’s reports folder.");
  const row = value as Record<string, unknown>;
  if (row.course !== "baodium-observability" || row.checkpoint !== checkpoint) throw new Error(`This lesson needs reports/${checkpoint}.json. Run the checkpoint below first.`);
  if (row.passed !== true) throw new Error("This checkpoint failed. Resolve the reported issue and rerun the command before importing a new report.");
  if (typeof row.checkedAt !== "string" || !Number.isFinite(Date.parse(row.checkedAt)) || !Array.isArray(row.checks) || !row.checks.length || row.checks.length > 50 || !row.checks.every(check => typeof check === "string" && check.length > 0 && check.length <= 4000)) throw new Error("The report is missing its timestamp or check results. Generate a new report with the lab CLI.");
  return { checkedAt: row.checkedAt, checks: row.checks as string[] };
}

export function CourseWalkthrough({ lesson }: { lesson: CourseLesson }) {
  const [step, setStep] = useState(0);
  const [notes, setNotes] = useState("");
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const key = `baodium-course-notes-v1:${lesson.slug}`;
  const checkpoint = lesson.checkpoint.trim().split(/\s+/).at(-1)!;
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(readStored(key) ?? "null");
        if (saved && typeof saved.notes === "string") setNotes(saved.notes.slice(0, 12000));
        if (saved && Number.isInteger(saved.step) && saved.step >= 0 && saved.step <= lesson.steps.length) setStep(saved.step);
      } catch { /* A damaged optional draft must not prevent learning. */ }
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [key, lesson.steps.length]);
  useEffect(() => {
    if (loaded) writeStored(key, JSON.stringify({ step, notes }));
  }, [key, step, notes, loaded]);
  const changeStep = (next: number) => {
    setStep(next);
    requestAnimationFrame(() => heading.current?.focus());
  };
  const current = lesson.steps[step];
  return (
    <section className="course-workspace" aria-label="Exercise steps">
      <div className="course-workspace-top"><span>{lesson.tool}</span><span>Step {step + 1} of {lesson.steps.length + 1}</span></div>
      <nav className="course-step-tabs" aria-label="Walkthrough steps">
        {[...lesson.steps.map(item => item.title), "Check the evidence"].map((title, index) => (
          <button type="button" key={title} aria-current={step === index ? "step" : undefined} onClick={() => changeStep(index)} disabled={!loaded}><span>{index + 1}</span>{title}</button>
        ))}
      </nav>
      <div className="course-workspace-body">
        <div>
          <h2 ref={heading} tabIndex={-1}>{current?.title ?? "Check the evidence"}</h2>
          {current ? <>
            <p>{current.instruction}</p>
            {lesson.slug === "setup" && step === 0 && <div className="course-launch-actions">
              <a href="https://codespaces.new/baodium/baodium-home?ref=main" target="_blank" rel="noopener noreferrer">Create a Codespace ↗</a>
              <a href="/downloads/baodium-observability-lab.zip" download>Download Docker lab ↓</a>
              <p>Codespaces opens a real workspace in GitHub. Sign-in is required; account quotas and billing apply. Wait for “Workspace ready”, then return here. Keep forwarded ports private. Stop or delete the Codespace when finished.</p>
            </div>}
            {current.command && <CourseCommand key={current.command} command={current.command} />}
            <div className="course-expect"><strong>What you should see</strong><p>{current.expect}</p></div>
          </> : <>
            <p>Run this checkpoint against your running stack, then import its JSON report.</p>
            <CourseCommand command={lesson.checkpoint} />
            <p>{lesson.checkpointMeaning}</p>
            <label className="course-report-label">Import reports/{checkpoint}.json
              <input type="file" accept=".json,application/json" onChange={async event => {
                const file = event.target.files?.[0];
                if (!file) return;
                setError(""); setEvidence(null);
                try {
                  if (file.size > 100000) throw new Error("Choose a checkpoint JSON report smaller than 100 KB.");
                  setEvidence(parseEvidence(JSON.parse(await file.text()), checkpoint));
                } catch (failure) { setError(failure instanceof SyntaxError ? "This file is not valid JSON." : failure instanceof Error ? failure.message : "Could not read this report."); }
                event.target.value = "";
              }} />
            </label>
            {error && <p role="alert" className="course-report-error">{error}</p>}
            {evidence && <div className="course-report-result" role="status"><strong>Passing report imported</strong><p>Checkpoint recorded at {evidence.checkedAt}</p><ul>{evidence.checks.map((check, index) => <li key={index}>{check}</li>)}</ul></div>}
            <p className="course-workspace-caption">The report stays in this browser. It records the checkpoint run, not the current health of your stack.</p>
          </>}
          <details className="course-hint"><summary>Help with this exercise</summary><p>{lesson.hint}</p></details>
        </div>
        <aside className="course-notebook">
          <label htmlFor="course-notes">Your lab notebook</label>
          <p>Write down what you expect before each step, then what you saw and how it differed.</p>
          <textarea id="course-notes" value={notes} disabled={!loaded} maxLength={12000} onChange={event => setNotes(event.target.value)} placeholder={"What I expect…\n\nWhat I saw…\n\nWhat I would try next…"} />
          <span>Saved on this browser when storage is available. Export to keep a copy.</span>
          <button type="button" disabled={!loaded} onClick={() => {
            const url = URL.createObjectURL(new Blob([`# ${lesson.title}\n\n${notes}\n`], { type: "text/markdown" }));
            const link = document.createElement("a"); link.href = url; link.download = `${lesson.slug}-notes.md`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}>Download notes ↓</button>
        </aside>
      </div>
      <div className="course-workspace-controls">
        <button type="button" disabled={!loaded || step === 0} onClick={() => changeStep(step - 1)}>← Previous task</button>
        <button type="button" disabled={!loaded || step === lesson.steps.length} onClick={() => changeStep(step + 1)}>Next task →</button>
      </div>
    </section>
  );
}

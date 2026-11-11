"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CodingProblem } from "@/lib/labs/coding";
import { draftKey, recordCodingRun } from "@/lib/labs/coding-progress";
import { readStored, writeStored } from "@/lib/storage";
import { runPython, type RunResult } from "@/lib/labs/python-runner";
const Editor = dynamic(
  () => import("./PythonEditor").then((module) => module.PythonEditor),
  {
    ssr: false,
    loading: () => <p className="coding-loading">Loading editor…</p>,
  },
);
export function CodingWorkspace({
  problem,
  next,
}: {
  problem: CodingProblem;
  next?: { id: string; title: string };
}) {
  const [editedSource, setSource] = useState<string | null>(null);
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const saved = useSyncExternalStore(
    (callback) => {
      window.addEventListener("storage", callback);
      return () => window.removeEventListener("storage", callback);
    },
    () => readStored(draftKey(problem.id)),
    () => null,
  );
  const source =
    editedSource ??
    (saved !== null && saved.length <= 50000 ? saved : problem.starter);
  const [plain, setPlain] = useState(false);
  const [phase, setPhase] = useState<"idle" | "loading" | "running">("idle");
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState("");
  const [testedSource, setTestedSource] = useState("");
  const [fullSuite, setFullSuite] = useState(false);
  const [resetPending, setResetPending] = useState(false);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const activeRun = useRef<ReturnType<typeof runPython> | null>(null);
  const generation = useRef(0);
  useEffect(() => {
    const runGeneration = generation;
    const execution = activeRun;
    return () => {
      runGeneration.current++;
      execution.current?.cancel();
    };
  }, []);
  function edit(value: string) {
    setSource(value);
    writeStored(draftKey(problem.id), value);
  }
  async function run(all: boolean) {
    const token = ++generation.current;
    setPhase("loading");
    setError("");
    setResult(null);
    setFullSuite(all);
    setTestedSource(source);
    const cases = all
      ? problem.cases
      : problem.cases.filter((test) => test.example);
    const execution = runPython(
      { source, entrypoint: problem.entrypoint, cases },
      () => {
        if (token === generation.current) setPhase("running");
      },
    );
    activeRun.current = execution;
    try {
      const value = await execution.promise;
      if (token !== generation.current) return;
      setResult(value);
      recordCodingRun(
        problem.id,
        value.results.filter((test) => test.passed).length,
        value.results.length,
        all,
      );
    } catch (cause) {
      if (token === generation.current)
        setError(
          cause instanceof Error
            ? cause.message
            : "Execution failed. Please retry.",
        );
    } finally {
      if (token === generation.current) {
        setPhase("idle");
        activeRun.current = null;
      }
    }
  }
  function download() {
    const blob = new Blob([source], { type: "text/x-python" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${problem.id}.py`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const passed = result?.results.filter((test) => test.passed).length ?? 0;
  const busy = phase !== "idle";
  const stale = Boolean(result) && source !== testedSource;
  return (
    <div className="coding-workspace">
      <section className="coding-prompt" aria-label="Problem description">
        <Link href="/sre-labs/coding" className="labs-back">
          ← Coding roadmap
        </Link>
        <div className="labs-kicker">
          {problem.category} / {problem.difficulty} / {problem.minutes} min
        </div>
        <h1>{problem.title}</h1>
        <p className="coding-lead">{problem.prompt}</p>
        <code className="coding-signature">{problem.signature}</code>
        <h2>Acceptance criteria</h2>
        <ul>
          {problem.constraints.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
        <h2>Examples</h2>
        {problem.cases
          .filter((test) => test.example)
          .slice(0, 2)
          .map((test) => (
            <div className="coding-example" key={test.id}>
              <h3>{test.title}</h3>
              <pre tabIndex={0}>{JSON.stringify(test.kwargs, null, 2)}</pre>
              <p>Expected</p>
              <pre tabIndex={0}>{JSON.stringify(test.expected, null, 2)}</pre>
            </div>
          ))}
        <h2>Build your reasoning</h2>
        <p>
          Predict one edge case before running. Explain your invariant and
          complexity after the tests pass.
        </p>
        {problem.hints.map((hint, index) => (
          <details className="coding-detail" key={hint}>
            <summary>Hint {index + 1}</summary>
            <p>{hint}</p>
          </details>
        ))}
        <details
          className="coding-detail"
          onToggle={(event) => setSolutionOpen(event.currentTarget.open)}
        >
          <summary>Approach and reference solution</summary>
          {solutionOpen ? (
            <>
              <p>{problem.explanation}</p>
              <p>
                <strong>Complexity:</strong> {problem.complexity}
              </p>
              <pre tabIndex={0}>{problem.solution}</pre>
              <p>
                Use this to compare approaches. Reading it does not mark the
                exercise complete.
              </p>
            </>
          ) : null}
        </details>
        <h2>Take it into production</h2>
        <p>{problem.followUp}</p>
        {problem.origin ? (
          <p className="coding-note">{problem.origin}.</p>
        ) : null}
      </section>
      <section className="coding-console" aria-label="Code and test workspace">
        <div className="coding-editor-bar">
          <span>
            solution.py <span className="coding-note">· Python</span>
          </span>
          <button type="button" onClick={() => setPlain(!plain)}>
            {plain ? "Use code editor" : "Use plain text editor"}
          </button>
        </div>
        <p className="coding-note coding-editor-help">
          Tab indents. Press Escape, then Tab to move out of the code editor.
          Drafts and progress stay in this browser.
        </p>
        {plain ? (
          <textarea
            className="coding-plain"
            aria-label="Python solution editor"
            spellCheck={false}
            value={source}
            onChange={(event) => edit(event.target.value)}
            readOnly={busy || !ready}
          />
        ) : (
          <Editor value={source} onChange={edit} readOnly={busy || !ready} />
        )}
        <div className="coding-actions">
          <button
            className="labs-button secondary"
            disabled={busy || !ready}
            onClick={() => run(false)}
          >
            Run examples
          </button>
          <button
            className="labs-button"
            disabled={busy || !ready}
            onClick={() => run(true)}
          >
            Run all checks
          </button>
          {busy ? (
            <button
              className="labs-button secondary"
              onClick={() => activeRun.current?.cancel()}
            >
              Stop run
            </button>
          ) : null}
        </div>
        <div className="coding-tools">
          <button onClick={download} disabled={!ready}>
            Download .py
          </button>
          <button
            disabled={busy || !ready}
            onClick={() => setResetPending(true)}
          >
            Reset starter
          </button>
        </div>
        {resetPending ? (
          <div className="coding-reset" role="group" aria-label="Confirm reset">
            <p>Replace this saved draft with the starter?</p>
            <button
              onClick={() => {
                edit(problem.starter);
                setResult(null);
                setError("");
                setResetPending(false);
              }}
            >
              Replace draft
            </button>
            <button onClick={() => setResetPending(false)}>Keep draft</button>
          </div>
        ) : null}
        <div className="coding-results" aria-live="polite" aria-busy={busy}>
          <h2>Test results</h2>
          {phase === "loading" ? (
            <p>
              Loading Python… The first run downloads a cached runtime. Your
              code executes in this browser.
            </p>
          ) : phase === "running" ? (
            <p>Executing {fullSuite ? "all checks" : "examples"}…</p>
          ) : null}
          {error ? (
            <p role="alert" className="coding-error">
              {error}
            </p>
          ) : null}
          {!busy && !result && !error ? (
            <p>
              Run the examples for feedback, then run all {problem.cases.length}{" "}
              checks. Only a complete passing suite records completion.
            </p>
          ) : null}
          {result ? (
            <>
              <p
                className={
                  passed === result.results.length
                    ? "coding-pass"
                    : "coding-error"
                }
              >
                {passed} / {result.results.length} checks passed
                {fullSuite && passed === result.results.length
                  ? " · Full suite passed"
                  : ""}
              </p>
              {stale ? (
                <p className="coding-error">
                  Code changed since this run. Run again to check your current
                  draft.
                </p>
              ) : null}
              <ol>
                {result.results.map((test) => (
                  <li key={test.id}>
                    <strong>
                      {test.passed ? "✓" : "×"} {test.title}
                    </strong>
                    <p>{test.detail}</p>
                  </li>
                ))}
              </ol>
              {result.output ? (
                <details open>
                  <summary>Program output (first 4,000 characters)</summary>
                  <pre tabIndex={0}>{result.output}</pre>
                </details>
              ) : null}
            </>
          ) : null}
        </div>
        <p className="coding-note">
          Practice checks are inspectable in the browser, not a secure exam.
          Each run has a fresh Python runtime, a 3-second execution limit and a
          Stop button. Runtime download requires an internet connection.
        </p>
        {next ? (
          <Link className="coding-next" href={`/sre-labs/coding/${next.id}`}>
            Next exercise: {next.title} →
          </Link>
        ) : (
          <Link className="coding-next" href="/sre-labs/observability">
            Apply your skills in the real observability stack →
          </Link>
        )}
      </section>
    </div>
  );
}

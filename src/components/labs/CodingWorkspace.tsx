"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { CodingProblem } from "@/lib/labs/coding";
import { codingSummaries, CODING_CATEGORIES } from "@/lib/labs/coding";
import {
  draftKey,
  loadCodingProgress,
  loadPracticeLanguage,
  progressKey,
  recordCodingRun,
  storePracticeLanguage,
  subscribeCodingProgress,
  subscribePracticeLanguage,
  codingServerSnapshot,
  languageServerSnapshot,
} from "@/lib/labs/coding-progress";
import {
  languageEntrypoint,
  languageLabel,
  languageSignature,
  PRACTICE_LANGUAGES,
  runtimeNote,
  signatureParams,
  starterFor,
  type PracticeLanguage,
} from "@/lib/labs/languages";
import { readStored, writeStored } from "@/lib/storage";
import { runGo, runTypeScript } from "@/lib/labs/language-runner";
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
  const reduce = useReducedMotion();
  const [edited, setEdited] = useState<{
    language: PracticeLanguage;
    value: string;
  } | null>(null);
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const language = useSyncExternalStore(
    subscribePracticeLanguage,
    loadPracticeLanguage,
    languageServerSnapshot,
  );
  const progress = useSyncExternalStore(
    subscribeCodingProgress,
    loadCodingProgress,
    codingServerSnapshot,
  );
  const saved = useSyncExternalStore(
    (callback) => {
      window.addEventListener("storage", callback);
      return () => window.removeEventListener("storage", callback);
    },
    () => readStored(draftKey(problem.id, language)),
    () => null,
  );
  const starter = starterFor(problem, language);
  const source =
    edited?.language === language
      ? edited.value
      : saved !== null && saved.length <= 50000
        ? saved
        : starter;
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
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("lang");
    if (value === "go" || value === "typescript" || value === "python") {
      storePracticeLanguage(value);
    }
  }, []);
  function edit(value: string) {
    setEdited({ language, value });
    writeStored(draftKey(problem.id, language), value);
  }
  function chooseLanguage(nextLanguage: PracticeLanguage) {
    if (nextLanguage === language) return;
    activeRun.current?.cancel();
    storePracticeLanguage(nextLanguage);
    setResult(null);
    setError("");
    setResetPending(false);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", nextLanguage);
    window.history.replaceState(null, "", url);
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
    const entrypoint = languageEntrypoint(problem.entrypoint, language);
    const execution =
      language === "python"
        ? runPython({ source, entrypoint, cases }, () => {
            if (token === generation.current) setPhase("running");
          })
        : (language === "typescript" ? runTypeScript : runGo)(
            {
              source,
              entrypoint,
              cases,
              params: signatureParams(problem.signature),
            },
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
        language,
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
    const extension =
      language === "go" ? "go" : language === "typescript" ? "ts" : "py";
    const blob = new Blob([source], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${problem.id}.${extension}`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const passed = result?.results.filter((test) => test.passed).length ?? 0;
  const busy = phase !== "idle";
  const stale = Boolean(result) && source !== testedSource;
  const filename =
    language === "go"
      ? "solution.go"
      : language === "typescript"
        ? "solution.ts"
        : "solution.py";
  const editorLabel =
    language === "go"
      ? "Go solution editor"
      : language === "typescript"
        ? "TypeScript solution editor"
        : "Python solution editor";
  const extension =
    language === "go" ? "go" : language === "typescript" ? "ts" : "py";
  const stageProblems = codingSummaries().filter(
    (item) => item.category === problem.category,
  );
  const stagePassed = stageProblems.filter(
    (item) => progress[progressKey(item.id, language)]?.status === "passed",
  ).length;
  const stageIndex = CODING_CATEGORIES.indexOf(
    problem.category as (typeof CODING_CATEGORIES)[number],
  );
  const firstMiss = result?.results.find((test) => !test.passed);
  const story =
    result && !stale
      ? passed === result.results.length && fullSuite
        ? `The full suite passed in ${languageLabel(language)}. ${problem.category} has ${stagePassed} of ${stageProblems.length} exercises saved on this device.`
        : passed === result.results.length
          ? "The examples passed. Run the full suite if you want this exercise to count."
          : `${passed} of ${result.results.length} checks passed. ${firstMiss?.title ?? "One check"} still does not match.`
      : "";
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
        <code className="coding-signature">
          {languageSignature(problem, language)}
        </code>
        {problem.format !== "implementation" && language !== "python" ? (
          <p className="coding-note">
            The Python draft is the one with a gap to close. Go and TypeScript
            start from the signature and run the same checks.
          </p>
        ) : null}
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
        <h2>Before you run</h2>
        <p>
          Name one input the examples do not show. After the full suite passes,
          write down the time cost and one case you would add.
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
              <p>The reference below is Python.</p>
              <pre tabIndex={0}>{problem.solution}</pre>
              <p>
                Use it to compare approaches. Opening it does not record a pass.
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
        <div
          className="coding-languages"
          role="group"
          aria-label="Practice language"
        >
          {PRACTICE_LANGUAGES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={language === item.id}
              onClick={() => chooseLanguage(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="coding-note coding-stage">
          Stage {stageIndex + 1} of {CODING_CATEGORIES.length}, {problem.category}.{" "}
          {stagePassed} of {stageProblems.length} full suites passed in{" "}
          {languageLabel(language)}. Progress for each language stays on this
          device.
        </p>
        <div className="coding-editor-bar">
          <span>
            {filename}{" "}
            <span className="coding-note">· {languageLabel(language)}</span>
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
            aria-label={editorLabel}
            spellCheck={false}
            value={source}
            onChange={(event) => edit(event.target.value)}
            readOnly={busy || !ready}
          />
        ) : (
          <Editor
            value={source}
            onChange={edit}
            readOnly={busy || !ready}
            language={language}
          />
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
            Download .{extension}
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
                edit(starter);
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
              {language === "python"
                ? "Loading Python. The first run downloads a cached runtime. Your code executes in this browser."
                : language === "go"
                  ? "Loading Go. The first run downloads a cached runtime. Your code executes in this browser."
                  : "Checking TypeScript in this browser."}
            </p>
          ) : phase === "running" ? (
            <p>Executing {fullSuite ? "all checks" : "examples"}.</p>
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
              {story ? (
                <motion.p
                  className="coding-story"
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduce ? 0 : 0.22 }}
                >
                  {story}
                </motion.p>
              ) : null}
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
          These checks run in the browser. They are practice, not a sealed exam.{" "}
          {runtimeNote(language)}
        </p>
        {next ? (
          <Link
            className="coding-next"
            href={`/sre-labs/coding/${next.id}?lang=${language}`}
          >
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

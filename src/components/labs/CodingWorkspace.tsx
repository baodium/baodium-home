"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { CodingProblem } from "@/lib/labs/coding";
import { codingSummaries } from "@/lib/labs/coding";
import { codingLesson } from "@/lib/learning/coding-course";
import {
  failureCoach,
  framingFor,
  progressiveHints,
  workedPattern,
} from "@/lib/labs/coding-pedagogy";
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
  const examples = problem.cases.filter((item) => item.example);
  const shownCases = examples.length > 0 ? examples : problem.cases.slice(0, 1);
  const [caseId, setCaseId] = useState(shownCases[0]?.id ?? "");
  const [testTab, setTestTab] = useState<"case" | "result">("case");
  const activeCase = shownCases.find((item) => item.id === caseId) ?? shownCases[0];
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
  const [hintStep, setHintStep] = useState(0);
  const [openHint, setOpenHint] = useState<number | null>(null);
  const [layout, setLayout] = useState<"split" | "editor" | "maximized">(
    "split",
  );
  const activeRun = useRef<ReturnType<typeof runPython> | null>(null);
  const generation = useRef(0);
  const hints = progressiveHints(problem);
  const framing = framingFor(problem);
  const pattern = workedPattern(problem);
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
  useEffect(() => {
    setHintStep(0);
    setOpenHint(null);
    setSolutionOpen(false);
  }, [problem.id]);
  useEffect(() => {
    if (layout === "split") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLayout("split");
    };
    const previous = document.body.style.overflow;
    if (layout === "maximized") document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [layout]);
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
      setTestTab("result");
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
  const firstMiss = result?.results.find((test) => !test.passed);
  const story =
    result && !stale
      ? passed === result.results.length && fullSuite
        ? `The full suite passed in ${languageLabel(language)}. ${problem.category} has ${stagePassed} of ${stageProblems.length} exercises saved on this device.`
        : passed === result.results.length
          ? "The examples passed. Run the full suite if you want this exercise to count."
          : firstMiss
            ? `${passed} of ${result.results.length} checks passed. ${firstMiss.title} still does not match. ${failureCoach(problem, firstMiss)}`
            : `${passed} of ${result.results.length} checks passed.`
      : "";
  const craft = codingLesson(problem, next?.title);
  const hintsUnlocked = hintStep;
  const allHintsSeen = hintStep >= hints.length;
  return (
    <div className="coding-ide" data-layout={layout}>
      <div className="coding-ide-chrome" role="toolbar" aria-label="Workspace layout">
        <p>
          {layout === "maximized"
            ? "Full workspace"
            : layout === "editor"
              ? "Editor focus"
              : "Split workspace"}
        </p>
        <div>
          <button
            type="button"
            aria-pressed={layout === "editor"}
            onClick={() =>
              setLayout((current) =>
                current === "editor" ? "split" : "editor",
              )
            }
          >
            {layout === "editor" ? "Show brief" : "Expand editor"}
          </button>
          <button
            type="button"
            aria-pressed={layout === "maximized"}
            onClick={() =>
              setLayout((current) =>
                current === "maximized" ? "split" : "maximized",
              )
            }
          >
            {layout === "maximized" ? "Exit full screen" : "Maximize"}
          </button>
        </div>
      </div>
      <section className="coding-description" aria-label="Problem description">
        <Link href="/sre-labs/coding" className="labs-back">
          ← Coding roadmap
        </Link>
        <p className="coding-progress">
          {craft.index} of {craft.total} · {problem.category} · {problem.minutes}{" "}
          min
        </p>
        <h1>{problem.title}</h1>
        <p className="coding-lead">{problem.prompt}</p>
        <p className="coding-framing">{craft.paragraphs[0]}</p>

        <h2>In production</h2>
        <p className="coding-framing">{framing.situation}</p>

        <h2>What the function must guarantee</h2>
        <p className="coding-framing">{framing.guarantee}</p>
        <ul>
          {problem.constraints.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>

        <h2>Watch these edges</h2>
        <ul>
          {framing.edges.map((edge) => (
            <li key={edge}>{edge}</li>
          ))}
        </ul>

        <details className="coding-detail coding-lesson-quiet">
          <summary>Ideas that travel with this stage</summary>
          <dl className="coding-concepts">
            {craft.concepts.map((concept) => (
              <div key={concept.name}>
                <dt>{concept.name}</dt>
                <dd>{concept.body}</dd>
              </div>
            ))}
          </dl>
        </details>

        <details className="coding-detail coding-lesson-quiet">
          <summary>Getting started</summary>
          <p className="coding-note">{craft.stageLabel}</p>
          <ol className="coding-steps">
            {craft.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <ul className="coding-steps" aria-label="By the end">
            {craft.outcomes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>

        <h2>Signature</h2>
        <code className="coding-signature">
          {languageSignature(problem, language)}
        </code>
        {problem.format === "complete" ? (
          <p className="coding-note">
            The starter already has structure. Fill the TODOs so the suite
            passes in {languageLabel(language)}.
          </p>
        ) : null}
        {problem.format === "debug" ? (
          <p className="coding-note">
            The starter is a buggy draft. Repair it until the suite passes in{" "}
            {languageLabel(language)}.
          </p>
        ) : null}

        <h2>When you are stuck</h2>
        <p className="coding-note">
          Hints open one step at a time: concept, then approach, then a partial
          sketch. The reference stays closed until you have seen each step.
        </p>
        <ol className="coding-hints">
          {hints.map((hint, index) => {
            const unlocked = index < hintsUnlocked;
            const isNext = index === hintsUnlocked;
            return (
              <li key={hint.id} data-unlocked={unlocked || undefined}>
                {unlocked ? (
                  <details
                    className="coding-detail"
                    open={openHint === index}
                    onToggle={(event) => {
                      if (event.currentTarget.open) setOpenHint(index);
                      else if (openHint === index) setOpenHint(null);
                    }}
                  >
                    <summary>
                      {hint.label}
                      <span className="coding-hint-meta">{hint.summary}</span>
                    </summary>
                    <p>{hint.text}</p>
                  </details>
                ) : isNext ? (
                  <button
                    type="button"
                    className="coding-hint-unlock"
                    onClick={() => {
                      setHintStep(index + 1);
                      setOpenHint(index);
                    }}
                  >
                    Reveal {hint.label.toLowerCase()}
                    <span className="coding-hint-meta">{hint.summary}</span>
                  </button>
                ) : (
                  <p className="coding-hint-locked">
                    {hint.label}
                    <span className="coding-hint-meta">
                      Opens after the previous step
                    </span>
                  </p>
                )}
              </li>
            );
          })}
        </ol>

        {allHintsSeen ? (
          <details
            className="coding-detail"
            onToggle={(event) => setSolutionOpen(event.currentTarget.open)}
          >
            <summary>Why this shape, and a reference</summary>
            {solutionOpen ? (
              <>
                <p>{pattern.why}</p>
                <p>
                  <strong>Cost:</strong> {pattern.cost}
                </p>
                <p>The reference below is Python.</p>
                <pre tabIndex={0}>{problem.solution}</pre>
                <p>Opening it does not record a pass.</p>
              </>
            ) : null}
          </details>
        ) : (
          <p className="coding-note">
            Reveal each hint step before the reference solution unlocks.
          </p>
        )}

        {passed === result?.results.length && fullSuite && !stale ? (
          <div className="coding-reflection">
            <p className="coding-lead">{problem.followUp}</p>
            <ul>
              {craft.reflection.slice(1).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {craft.next.bridge ? (
              <p className="coding-note">{craft.next.bridge}</p>
            ) : null}
          </div>
        ) : null}
        {problem.origin ? <p className="coding-note">{problem.origin}.</p> : null}
      </section>
      <section className="coding-console coding-code" aria-label="Code editor">
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
        <div className="coding-editor-bar">
          <span>
            {filename}{" "}
            <span className="coding-note">· {languageLabel(language)}</span>
          </span>
          <button type="button" onClick={() => setPlain(!plain)}>
            {plain ? "Code editor" : "Plain text"}
          </button>
        </div>
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
      </section>
      <section className="coding-tests" aria-label="Testcase and result">
        <div className="coding-results" aria-live="polite" aria-busy={busy}>
          <div className="coding-test-tabs" role="tablist" aria-label="Checks">
            <button
              type="button"
              role="tab"
              aria-selected={testTab === "case"}
              onClick={() => setTestTab("case")}
            >
              Cases
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={testTab === "result"}
              onClick={() => setTestTab("result")}
            >
              Result
            </button>
          </div>
          {testTab === "case" && activeCase ? (
            <div className="coding-case">
              <div className="coding-case-switch">
                {shownCases.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={item.id === activeCase.id}
                    onClick={() => setCaseId(item.id)}
                  >
                    Case {index + 1}
                  </button>
                ))}
              </div>
              <h2>{activeCase.title}</h2>
              {Object.entries(activeCase.kwargs).map(([key, value]) => (
                <div key={key}>
                  <p>{key}</p>
                  <pre tabIndex={0}>{JSON.stringify(value, null, 2)}</pre>
                </div>
              ))}
              <p>Expected</p>
              <pre tabIndex={0}>
                {JSON.stringify(activeCase.expected, null, 2)}
              </pre>
            </div>
          ) : (
            <>
              <h2>Result</h2>
              {phase === "loading" ? (
                <p>
                  {language === "python"
                    ? "Loading Python. The first run downloads a cached runtime."
                    : language === "go"
                      ? "Loading Go. The first run downloads a cached runtime."
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
                  Run the examples for feedback, then run all{" "}
                  {problem.cases.length} checks. Only a complete passing suite
                  records completion.
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
                      Code changed since this run. Run again to check your
                      current draft.
                    </p>
                  ) : null}
                  <ol>
                    {result.results.map((test) => (
                      <li key={test.id}>
                        <strong>
                          {test.passed ? "✓" : "×"} {test.title}
                        </strong>
                        <p>{test.detail}</p>
                        {!test.passed ? (
                          <p className="coding-coach">
                            {failureCoach(problem, test)}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                  {result.output ? (
                    <details>
                      <summary>Program output</summary>
                      <pre tabIndex={0}>{result.output}</pre>
                    </details>
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </div>
        <p className="coding-note">
          {runtimeNote(language)} {stagePassed} of {stageProblems.length} in{" "}
          {problem.category} passed in {languageLabel(language)} on this device.
        </p>
        {next ? (
          <p className="lesson-next">
            <Link href={`/sre-labs/coding/${next.id}?lang=${language}`}>
              Next: {craft.next.label}
            </Link>
          </p>
        ) : (
          <p className="lesson-next">
            <Link href={craft.next.href ?? "/sre-labs/observability"}>
              {craft.next.label}
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}

"use client";

import { useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { EditorView } from "@codemirror/view";
import { runChecks, type TestRow } from "@/lib/products/code";
import { loadDraft, saveDraft } from "@/lib/products/progress";
import type { LabRuntime } from "@/lib/products/runtime";

type Step = { id: "build" | "tests" | "canary" | "rollout"; label: string; state: "waiting" | "running" | "passed" | "failed"; detail?: string };
type Session = { draft: string; results?: TestRow[]; compileError?: string; steps?: Step[]; busy?: "tests" | "deploy" };

const sessions = new WeakMap<LabRuntime, Session>();
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const jsExtensions = [javascript(), EditorView.lineWrapping];
const textExtensions = [EditorView.lineWrapping];

export function CodePanel({ runtime }: { runtime: LabRuntime }) {
  const host = runtime.code;
  const files = host?.files ?? runtime.incident.files ?? [];
  const editable = host?.path;
  const [path, setPath] = useState(editable ?? files[0]?.path);
  const [session, setSessionState] = useState<Session>(() => {
    const existing = sessions.get(runtime);
    if (existing) return existing;
    const fresh = { draft: loadDraft(runtime.incident.id) ?? runtime.deployedSource() };
    sessions.set(runtime, fresh);
    return fresh;
  });
  const update = (patch: Partial<Session>) => {
    const next = { ...(sessions.get(runtime) ?? session), ...patch };
    sessions.set(runtime, next);
    setSessionState(next);
  };
  const file = files.find((item) => item.path === path) ?? files[0];
  const isEditable = Boolean(host && file?.path === editable);
  const value = isEditable ? session.draft : file?.source ?? "";
  const deployed = runtime.deployedSource();
  const dirty = isEditable && session.draft !== deployed;
  const live = host ? runtime.releases.find((release) => release.state === "live" && release.source !== undefined) : undefined;

  async function test() {
    if (!host) return;
    update({ busy: "tests", results: undefined, compileError: undefined, steps: undefined });
    const run = await runChecks({ source: session.draft, exportNames: host.exportNames, testSource: host.testSource });
    update({ busy: undefined, results: run.results, compileError: run.compileError });
  }

  async function deploy() {
    if (!host) return;
    const draft = session.draft;
    const steps: Step[] = [
      { id: "build", label: "Build", state: "running" },
      { id: "tests", label: "Tests", state: "waiting" },
      { id: "canary", label: "Canary replay", state: "waiting" },
      { id: "rollout", label: "Roll out to 100 percent", state: "waiting" },
    ];
    const set = (id: Step["id"], patch: Partial<Step>) => {
      const index = steps.findIndex((step) => step.id === id);
      steps[index] = { ...steps[index], ...patch };
      update({ steps: [...steps] });
    };
    update({ busy: "deploy", steps: [...steps], results: undefined, compileError: undefined });
    const replay = host.replay ? { fn: host.replay.fn, inputs: host.replay.inputs() } : undefined;
    const [run] = await Promise.all([runChecks({ source: draft, exportNames: host.exportNames, testSource: host.testSource, replay }), wait(450)]);
    if (run.compileError) {
      set("build", { state: "failed", detail: run.compileError });
      update({ busy: undefined, compileError: run.compileError });
      return;
    }
    set("build", { state: "passed" });
    set("tests", { state: "running" });
    await wait(400);
    const failed = run.results.filter((row) => !row.passed).length;
    update({ results: run.results });
    if (failed) {
      set("tests", { state: "failed", detail: `${failed} of ${run.results.length} failing. Nothing was deployed.` });
      update({ busy: undefined });
      return;
    }
    set("tests", { state: "passed", detail: `${run.results.length} of ${run.results.length} passing` });
    if (host.replay && run.replay) {
      set("canary", { state: "running" });
      await wait(500);
      const verdict = host.replay.judge(run.replay.outputs);
      if (run.replay.errors.length || !verdict.ok) {
        set("canary", { state: "failed", detail: run.replay.errors[0] ?? `${verdict.summary}. Rollout stopped.` });
        update({ busy: undefined });
        return;
      }
      set("canary", { state: "passed", detail: verdict.summary });
    } else {
      set("canary", { state: "passed", detail: "No replay for this service" });
    }
    set("rollout", { state: "running" });
    await wait(450);
    try {
      runtime.ship(draft, "Fix from the incident");
      saveDraft(runtime.incident.id, null);
      const version = runtime.releases[0]?.version;
      set("rollout", { state: "passed", detail: `Release ${version} is live` });
    } catch (error) {
      set("rollout", { state: "failed", detail: error instanceof Error ? error.message : String(error) });
    }
    update({ busy: undefined });
  }

  return (
    <div className="pl-code">
      <nav className="pl-files" aria-label="Files">
        {files.map((item) => (
          <button key={item.path} type="button" aria-current={item.path === file?.path ? "true" : undefined} onClick={() => setPath(item.path)}>
            <span>{item.path.split("/").slice(0, -1).join("/")}/</span>
            <strong>{item.path.split("/").pop()}</strong>
            {item.path === editable ? <em>{dirty ? "edited" : "editable"}</em> : null}
          </button>
        ))}
      </nav>
      <div className="pl-editor-wrap">
        <div className="pl-editor-head">
          <p>
            <strong>{file?.path}</strong>
            {isEditable ? (live ? ` · live in ${live.service} ${live.version}` : "") : " · read only"}
          </p>
          {isEditable ? (
            <div className="pl-editor-actions">
              {dirty ? (
                <button type="button" className="pl-ghost" onClick={() => { update({ draft: deployed }); saveDraft(runtime.incident.id, null); }}>
                  Discard changes
                </button>
              ) : null}
              <button type="button" className="pl-ghost" onClick={test} disabled={Boolean(session.busy)}>
                {session.busy === "tests" ? "Running tests…" : "Run tests"}
              </button>
              <button type="button" className="pl-primary" onClick={deploy} disabled={Boolean(session.busy) || !dirty}>
                {session.busy === "deploy" ? "Deploying…" : "Deploy"}
              </button>
            </div>
          ) : null}
        </div>
        <CodeMirror
          value={value}
          onChange={(next) => {
            if (!isEditable) return;
            update({ draft: next });
            saveDraft(runtime.incident.id, next);
          }}
          readOnly={!isEditable}
          editable={isEditable}
          extensions={file?.language === "javascript" ? jsExtensions : textExtensions}
          theme="dark"
          aria-label={isEditable ? `${file?.path} editor` : `${file?.path}, read only`}
          basicSetup={{ lineNumbers: true, foldGutter: false, autocompletion: false, highlightActiveLine: isEditable }}
          className="pl-editor"
        />
        {!host ? (
          <p className="pl-note">This incident has no code change. The levers are in Releases and config.</p>
        ) : null}
        {session.steps ? (
          <ol className="pl-pipeline" aria-label="Deploy pipeline" aria-live="polite">
            {session.steps.map((step) => (
              <li key={step.id} data-state={step.state}>
                <span className="pl-step-mark" aria-hidden="true" />
                <strong>{step.label}</strong>
                {step.detail ? <span>{step.detail}</span> : null}
              </li>
            ))}
          </ol>
        ) : null}
        {session.compileError && !session.steps ? <p className="pl-compile">{session.compileError}</p> : null}
        {session.results?.length ? (
          <ul className="pl-tests" aria-label="Test results">
            {session.results.map((row) => (
              <li key={row.title} data-passed={row.passed}>
                <span aria-hidden="true">{row.passed ? "✓" : "✕"}</span>
                <span>
                  {row.title}
                  {row.detail ? <small>{row.detail}</small> : null}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

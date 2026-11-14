"use client";

import { useMemo, useState } from "react";
import type { EngineState } from "@/lib/sre/engine";
import type { Controls, Scene } from "@/lib/sre/model";
import {
  DEFAULT_RULE,
  evaluateAlertRule,
  parseAlertRule,
  type AlertRule,
} from "@/lib/sre/alert-rule";

const configText = (rule: AlertRule) => JSON.stringify(rule, null, 2);
export function AlertRuleWorkbench({
  engine,
  controls,
  onScene,
}: {
  engine: EngineState;
  controls: Controls;
  onScene: (scene: Scene) => void;
}) {
  const [rule, setRule] = useState(DEFAULT_RULE);
  const [draft, setDraft] = useState(configText(DEFAULT_RULE));
  const [error, setError] = useState("");
  const [applied, setApplied] = useState(false);
  const evaluations = useMemo(
    () => evaluateAlertRule(engine, controls, rule),
    [engine, controls, rule],
  );
  const current = evaluations.at(-1);
  const transitions = evaluations.filter(
    (row, index) => row.state !== evaluations[index - 1]?.state,
  );
  const update = (next: AlertRule) => {
    setRule(next);
    setDraft(configText(next));
    setError("");
    setApplied(false);
  };
  const apply = () => {
    try {
      setRule(parseAlertRule(draft));
      setError("");
      setApplied(true);
    } catch (cause) {
      setError(
        cause instanceof SyntaxError
          ? "Enter valid JSON with signal, threshold and forSeconds."
          : (cause as Error).message,
      );
      setApplied(false);
    }
  };
  return (
    <section
      className="exp-panel alert-rule-workbench"
      aria-labelledby="rule-workbench-title"
    >
      <p className="exp-kicker">Rule experiment, outside the graded lab</p>
      <h2 id="rule-workbench-title">Try the alert before it pages anyone.</h2>
      <p>
        Evaluate this rule against the retained scenario. CPU uses a 0–1
        fraction. Burn requires both the 12-second and 60-second windows to
        exceed the threshold, with at least 20 and 40 requests respectively.
      </p>
      <div className="rule-fields">
        <label>
          Signal
          <select
            value={rule.signal}
            onChange={(event) =>
              update({
                ...rule,
                signal: event.target.value as AlertRule["signal"],
                threshold: event.target.value === "cpu" ? 0.8 : 14.4,
              })
            }
          >
            <option value="burn">Multiwindow burn rate</option>
            <option value="cpu">CPU fraction</option>
          </select>
        </label>
        <label>
          Threshold
          <input
            type="number"
            min={0.01}
            max={rule.signal === "cpu" ? 1 : 1000}
            step={0.1}
            value={rule.threshold}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (value > 0 && value <= (rule.signal === "cpu" ? 1 : 1000))
                update({ ...rule, threshold: value });
            }}
          />
        </label>
        <label>
          Sustain for (seconds)
          <input
            type="number"
            min={0}
            max={60}
            step={1}
            value={rule.forSeconds}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (Number.isInteger(value) && value >= 0 && value <= 60)
                update({ ...rule, forSeconds: value });
            }}
          />
        </label>
      </div>
      <label className="rule-config-label" htmlFor="alert-rule-json">
        Rule configuration (JSON)
      </label>
      <textarea
        id="alert-rule-json"
        value={draft}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "rule-config-error" : "rule-config-help"}
        onChange={(event) => {
          setDraft(event.target.value);
          setApplied(false);
        }}
        spellCheck={false}
      />
      <p id="rule-config-help">
        Supported fields: signal, threshold, forSeconds. Applying the rule
        replays retained samples with the current SLI definition.
      </p>
      {error ? (
        <p role="alert" id="rule-config-error">
          {error}
        </p>
      ) : null}
      <div className="product-actions">
        <button className="product-button" onClick={apply}>
          Apply rule
        </button>
        {applied ? <span role="status">Rule applied.</span> : null}
      </div>
      <div
        className="rule-scenarios"
        role="group"
        aria-label="Test alert scenario"
      >
        {(
          [
            ["cpu-spike", "CPU spike"],
            ["short-spike", "Short failure spike"],
            ["sustained", "Sustained failure"],
            ["missing-telemetry", "Missing metrics"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            className="exp-btn exp-btn-ghost"
            onClick={() => onScene(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="rule-result" role="status">
        <strong>Rule state: {current?.state ?? "no-data"}</strong>
        <p>
          {current?.value == null
            ? "No eligible measurements. Missing data cannot satisfy the rule."
            : `At ${current.t.toFixed(0)}s, signal ${current.value.toFixed(2)} / threshold ${rule.threshold}. Condition held ${current.heldSeconds.toFixed(0)}s; requires ${rule.forSeconds}s.`}
        </p>
      </div>
      <details>
        <summary>Evaluation transitions ({transitions.length})</summary>
        <ol>
          {transitions.map((row) => (
            <li key={row.t}>
              {row.t.toFixed(0)}s — {row.state}
              {row.value == null ? "" : ` · signal ${row.value.toFixed(2)}`}
            </li>
          ))}
        </ol>
      </details>
      <p>
        These are simulated rule evaluations, not delivered pages. The guided
        curriculum uses its stated default alert; custom rules are an
        independent practice experiment.
      </p>
    </section>
  );
}

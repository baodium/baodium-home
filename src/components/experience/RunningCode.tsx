"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import type { NumberEdit, RunEdit, RunLine, RunningProgram } from "@/lib/experience/running-code";

const LABELS: Record<string, string> = {
  lookupsPerSec: "Lookups per second",
  queryMs: "Query time in milliseconds",
  payloadMs: "Payload build in milliseconds",
  holdDuringBuild: "Build while holding the connection",
  remainingMs: "Time checkout has left, in milliseconds",
  providerMs: "Provider time in milliseconds",
  reserveMs: "Reserve after risk, in milliseconds",
  permit: "Outbound permit",
  cancel: "Pass cancellation",
  readers: "Readers on this key",
  fresh: "Entry is fresh",
  singleflight: "Share one loader",
  lagMs: "Replica lag in milliseconds",
  replicaAvailable: "Replica available",
  sampleCurrent: "Lag sample is current",
  route: "How the read is chosen",
  allowPrimaryFallback: "Allow primary fallback",
  producePerSec: "Messages produced per second",
  partitions: "Partitions",
  consumers: "Consumers",
  processMs: "Handler time in milliseconds",
  claim: "Claim the message id",
  commitAfter: "Commit the offset after the task exists",
  readsPerSec: "Reads per second",
  occupancyMs: "Occupancy in milliseconds",
  extraPct: "Extra reads, percent",
  instances: "Instances",
  perInstance: "Connections per instance",
  instanceDown: "One instance is down",
  exposurePct: "Exposure percent",
  flagOff: "Flag off for new calls",
  timeoutMs: "Client timeout in milliseconds",
  reuseOperationId: "Reuse the operation id",
  outbox: "Write the notification with the charge",
  admitPerSec: "Admission limit per second",
};

type EditValue = number | boolean | string;

export function RunningCode({
  program,
  onEdit,
  part = "all",
}: {
  program: RunningProgram;
  onEdit: (id: string, value: EditValue) => void;
  /** inputs: the editable lines only. trace: the path only. all: the listing. */
  part?: "all" | "inputs" | "trace";
}) {
  const showLines = part !== "trace";
  const showTrace = part !== "inputs";
  const lines = part === "inputs" ? program.lines.filter((entry) => !entry.walk) : program.lines;

  return (
    <section className={part === "all" ? "run-code" : "run-code run-code-embedded"} aria-label={program.title}>
      {part === "all" ? (
        <header className="run-code-head">
          <h2>{program.title}</h2>
        </header>
      ) : null}
      {showLines ? (
        <ol className="run-code-lines">
          {lines.map((entry, index) => (
            <CodeLine
              key={`${index}-${entry.spans.map(spanKey).join("")}`}
              entry={entry}
              hot={part === "all" && index === program.hotLine}
              onEdit={onEdit}
            />
          ))}
        </ol>
      ) : null}
      {showTrace && program.trace.length > 0 ? (
        <ol className="run-trace">
          {program.trace.map((step, index) => (
            <li key={step.label} data-hot={index === program.hotTrace ? "true" : "false"}>
              <span>{step.label}</span>
              <span>{step.detail}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

function spanKey(span: RunLine["spans"][number]): string {
  if ("text" in span) return span.text;
  return span.edit.id;
}

function CodeLine({
  entry,
  hot,
  onEdit,
}: {
  entry: RunLine;
  hot: boolean;
  onEdit: (id: string, value: EditValue) => void;
}) {
  const selectable = !entry.runs && entry.select != null;
  return (
    <li
      className="run-code-line"
      data-hot={hot ? "true" : "false"}
      data-runs={entry.runs ? "true" : "false"}
      {...(selectable
        ? {
            role: "button" as const,
            tabIndex: 0,
            "aria-label": "Run this listing",
            onClick: () => onEdit(entry.select!.id, entry.select!.value),
            onKeyDown: (event: KeyboardEvent<HTMLLIElement>) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onEdit(entry.select!.id, entry.select!.value);
              }
            },
          }
        : {})}
    >
      {entry.spans.map((span, index) =>
        "text" in span ? (
          <span key={index}>{span.text}</span>
        ) : (
          <EditToken key={span.edit.id} edit={span.edit} onEdit={onEdit} />
        ),
      )}
    </li>
  );
}

function EditToken({ edit, onEdit }: { edit: RunEdit; onEdit: (id: string, value: EditValue) => void }) {
  if (edit.kind === "number") {
    return <NumberToken edit={edit} onEdit={onEdit} />;
  }
  if (edit.kind === "bool") {
    return (
      <button
        type="button"
        className="run-token"
        aria-label={LABELS[edit.id] ?? edit.id}
        title={LABELS[edit.id] ?? edit.id}
        aria-pressed={edit.value}
        disabled={edit.locked}
        onClick={(event) => {
          event.stopPropagation();
          if (!edit.locked) onEdit(edit.id, !edit.value);
        }}
      >
        {edit.value ? edit.onLabel : edit.offLabel}
      </button>
    );
  }
  return (
    <select
      className="run-token"
      aria-label={LABELS[edit.id] ?? edit.id}
      title={LABELS[edit.id] ?? edit.id}
      disabled={edit.locked}
      value={edit.value}
      onChange={(event) => onEdit(edit.id, event.target.value)}
      onClick={(event) => event.stopPropagation()}
    >
      {edit.options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function NumberToken({
  edit,
  onEdit,
}: {
  edit: NumberEdit;
  onEdit: (id: string, value: number | boolean | string) => void;
}) {
  const draftRef = useRef<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? formatNumber(edit.value, edit.step);
  function writeDraft(value: string | null) {
    draftRef.current = value;
    setDraft(value);
  }
  return (
    <input
      className="run-token"
      aria-label={LABELS[edit.id] ?? edit.id}
      title={LABELS[edit.id] ?? edit.id}
      inputMode="decimal"
      disabled={edit.locked}
      size={Math.max(shown.length, 2)}
      value={shown}
      onFocus={() => writeDraft(formatNumber(edit.value, edit.step))}
      onChange={(event) => writeDraft(event.target.value)}
      onBlur={() => {
        const current = draftRef.current;
        const next = Number(current);
        if (current != null && current.trim() !== "" && Number.isFinite(next)) {
          onEdit(edit.id, clampNumber(next, edit.min, edit.max, edit.step));
        }
        writeDraft(null);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      onClick={(event) => event.stopPropagation()}
    />
  );
}

function formatNumber(value: number, step: number): string {
  const digits = step < 1 ? 1 : 0;
  return value.toFixed(digits);
}

function clampNumber(value: number, min: number, max: number, step: number): number {
  const stepped = Math.round((value - min) / step) * step + min;
  const clamped = Math.min(max, Math.max(min, stepped));
  const digits = step < 1 ? 1 : 0;
  return Number(clamped.toFixed(digits));
}

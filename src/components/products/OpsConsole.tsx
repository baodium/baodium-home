"use client";

import { useState, type ReactNode } from "react";
import type { LabRuntime } from "@/lib/products/runtime";
import { clock, type LogLine, type Trace } from "@/lib/products/telemetry";
import { Chart } from "./Chart";
import { CodePanel } from "./CodePanel";
import { ReleasesPanel } from "./ReleasesPanel";

export type ConsoleTab = "overview" | "logs" | "traces" | "code" | "releases";

const TABS: { id: ConsoleTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "logs", label: "Logs" },
  { id: "traces", label: "Traces" },
  { id: "code", label: "Code" },
  { id: "releases", label: "Releases and config" },
];

export function OpsConsole({
  runtime,
  config,
}: {
  runtime: LabRuntime;
  config?: ReactNode;
}) {
  const [tab, setTab] = useState<ConsoleTab>("overview");
  const [traceId, setTraceId] = useState<string | null>(null);
  const [logQuery, setLogQuery] = useState("");
  const openTrace = (id: string) => {
    setTraceId(id);
    setTab("traces");
  };
  return (
    <section className="pl-console" aria-label="Operations console">
      <header className="pl-console-bar">
        <div className="pl-tabs" role="tablist" aria-label="Console views">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`pl-tab-${item.id}`}
              aria-selected={tab === item.id}
              aria-controls={`pl-panel-${item.id}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <span className="pl-clock" aria-label="Production time">
          <span aria-hidden="true" className="pl-live-dot" />
          {clock(runtime.now)}
        </span>
      </header>
      <div className="pl-panel" role="tabpanel" id={`pl-panel-${tab}`} aria-labelledby={`pl-tab-${tab}`}>
        {tab === "overview" ? <Overview runtime={runtime} onSearch={(q) => { setLogQuery(q); setTab("logs"); }} /> : null}
        {tab === "logs" ? <Logs runtime={runtime} query={logQuery} setQuery={setLogQuery} openTrace={openTrace} /> : null}
        {tab === "traces" ? <Traces runtime={runtime} selected={traceId} select={setTraceId} /> : null}
        {tab === "code" ? <CodePanel runtime={runtime} /> : null}
        {tab === "releases" ? <ReleasesPanel runtime={runtime}>{config}</ReleasesPanel> : null}
      </div>
    </section>
  );
}

function Overview({ runtime, onSearch }: { runtime: LabRuntime; onSearch: (query: string) => void }) {
  const charts = runtime.charts();
  const recent = [...runtime.telemetry.markers].filter((marker) => marker.t > runtime.now - 20 * 60_000).reverse();
  const errors = runtime.telemetry.logs.filter((line) => line.level === "error" && line.t > runtime.now - 5 * 60_000);
  const counts = new Map<string, number>();
  for (const line of errors) {
    const key = `${line.service}: ${line.message}${line.attrs.reason ? ` (${line.attrs.reason})` : ""}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  return (
    <div className="pl-overview">
      {charts.map((spec) => (
        <Chart key={spec.id} spec={spec} markers={runtime.telemetry.markers} now={runtime.now} />
      ))}
      <div className="pl-overview-foot">
        <section>
          <h3>Changes in the last 20 minutes</h3>
          {recent.length ? (
            <ul className="pl-events">
              {recent.map((marker) => (
                <li key={`${marker.t}-${marker.label}`}>
                  <time>{clock(marker.t)}</time>
                  {marker.label}
                </li>
              ))}
            </ul>
          ) : (
            <p className="pl-empty">No deploys or config changes.</p>
          )}
        </section>
        <section>
          <h3>Most frequent errors, last 5 minutes</h3>
          {top.length ? (
            <ul className="pl-events">
              {top.map(([key, count]) => (
                <li key={key}>
                  <button type="button" onClick={() => onSearch(key.split(": ")[1].split(" (")[0])}>
                    {key}
                  </button>
                  <strong>{count}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pl-empty">No error logs.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function matches(line: LogLine, query: string) {
  if (!query) return true;
  const text = `${line.service} ${line.message} ${Object.entries(line.attrs).map(([k, v]) => `${k}=${v}`).join(" ")}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => text.includes(word));
}

function Logs({
  runtime,
  query,
  setQuery,
  openTrace,
}: {
  runtime: LabRuntime;
  query: string;
  setQuery: (value: string) => void;
  openTrace: (id: string) => void;
}) {
  const [service, setService] = useState("all");
  const [level, setLevel] = useState<"all" | "warn" | "error">("all");
  const [mine, setMine] = useState(false);
  const [frozen, setFrozen] = useState<LogLine[] | null>(null);
  const services = [...new Set(runtime.telemetry.logs.map((line) => line.service))].sort();
  const source = frozen ?? runtime.telemetry.logs;
  const rows: LogLine[] = [];
  for (let i = source.length - 1; i >= 0 && rows.length < 250; i--) {
    const line = source[i];
    if (line.t > runtime.now) continue;
    if (service !== "all" && line.service !== service) continue;
    if (level === "error" && line.level !== "error") continue;
    if (level === "warn" && line.level === "info") continue;
    if (mine && !line.mine) continue;
    if (!matches(line, query)) continue;
    rows.push(line);
  }
  return (
    <div className="pl-logs">
      <div className="pl-toolbar">
        <label className="pl-search">
          <span className="sr-only">Search logs</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search words or key=value, e.g. chk_7f3a2c"
            spellCheck={false}
          />
        </label>
        <label>
          <span className="sr-only">Service</span>
          <select value={service} onChange={(event) => setService(event.target.value)}>
            <option value="all">All services</option>
            {services.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Level</span>
          <select value={level} onChange={(event) => setLevel(event.target.value as typeof level)}>
            <option value="all">All levels</option>
            <option value="warn">Warnings and errors</option>
            <option value="error">Errors</option>
          </select>
        </label>
        <label className="pl-toggle">
          <input type="checkbox" checked={mine} onChange={(event) => setMine(event.target.checked)} />
          Your requests
        </label>
        <button type="button" className="pl-ghost" onClick={() => setFrozen(frozen ? null : [...runtime.telemetry.logs])}>
          {frozen ? "Resume live tail" : "Pause"}
        </button>
      </div>
      <p className="pl-count" role="status">
        {rows.length === 250 ? "Newest 250 matching lines" : `${rows.length} matching lines`}
        {frozen ? ", paused" : ""}
      </p>
      <ol className="pl-loglines">
        {rows.map((line) => (
          <li key={line.seq} data-level={line.level} data-mine={line.mine || undefined}>
            <time>{clock(line.t)}</time>
            <span className="pl-level">{line.level}</span>
            <span className="pl-service">{line.service}</span>
            <span className="pl-message">
              {line.message}
              {Object.entries(line.attrs).map(([key, value]) => (
                <span key={key} className="pl-attr">
                  {" "}
                  <span>{key}=</span>
                  {String(value)}
                </span>
              ))}
            </span>
            {line.traceId ? (
              <button type="button" className="pl-trace-link" onClick={() => openTrace(line.traceId!)}>
                Trace
              </button>
            ) : null}
          </li>
        ))}
      </ol>
      {!rows.length ? <p className="pl-empty">No lines match. Clear the search or widen the level.</p> : null}
    </div>
  );
}

function Traces({ runtime, selected, select }: { runtime: LabRuntime; selected: string | null; select: (id: string | null) => void }) {
  const [filter, setFilter] = useState<"all" | "errors" | "slow" | "mine">("all");
  const [query, setQuery] = useState("");
  const traces = runtime.telemetry.traces;
  const durations = traces.map((trace) => trace.duration).sort((a, b) => a - b);
  const slowAt = durations[Math.floor(durations.length * 0.9)] ?? Infinity;
  const list: Trace[] = [];
  for (let i = traces.length - 1; i >= 0 && list.length < 120; i--) {
    const trace = traces[i];
    if (trace.t > runtime.now) continue;
    if (filter === "errors" && !trace.error) continue;
    if (filter === "slow" && trace.duration < slowAt) continue;
    if (filter === "mine" && !trace.mine) continue;
    if (query && !`${trace.name} ${Object.entries(trace.attrs).map(([k, v]) => `${k}=${v}`).join(" ")}`.toLowerCase().includes(query.toLowerCase())) continue;
    list.push(trace);
  }
  const current = traces.find((trace) => trace.id === selected);
  if (current) {
    return <Waterfall trace={current} back={() => select(null)} />;
  }
  return (
    <div className="pl-traces">
      <div className="pl-toolbar">
        <div className="pl-segmented" role="group" aria-label="Show traces">
          {(
            [
              ["all", "All"],
              ["errors", "Errors"],
              ["slow", "Slowest 10%"],
              ["mine", "Yours"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>
              {label}
            </button>
          ))}
        </div>
        <label className="pl-search">
          <span className="sr-only">Search traces</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search attributes" spellCheck={false} />
        </label>
      </div>
      <table className="pl-trace-table">
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Request</th>
            <th scope="col">Duration</th>
            <th scope="col">Spans</th>
            <th scope="col">Detail</th>
          </tr>
        </thead>
        <tbody>
          {list.map((trace) => (
            <tr key={trace.id} data-error={trace.error ? true : undefined} data-mine={trace.mine || undefined}>
              <td>{clock(trace.t)}</td>
              <td>
                <button type="button" onClick={() => select(trace.id)}>
                  {trace.name}
                </button>
              </td>
              <td className="pl-num">{trace.duration >= 1000 ? `${(trace.duration / 1000).toFixed(2)} s` : `${Math.round(trace.duration)} ms`}</td>
              <td className="pl-num">{trace.spans.length}</td>
              <td className="pl-trace-detail">
                {trace.error ? <span className="pl-badge-bad">{trace.error}</span> : null}
                {Object.entries(trace.attrs)
                  .slice(0, 3)
                  .map(([key, value]) => `${key}=${value}`)
                  .join("  ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!list.length ? <p className="pl-empty">No traces match.</p> : null}
    </div>
  );
}

function Waterfall({ trace, back }: { trace: Trace; back: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const total = Math.max(trace.duration, ...trace.spans.map((span) => span.start + span.duration), 1);
  const depth = (id?: string): number => {
    const span = trace.spans.find((item) => item.id === id);
    return span?.parentId ? 1 + depth(span.parentId) : 0;
  };
  const ordered = [...trace.spans].sort((a, b) => (a.parentId ? 1 : 0) - (b.parentId ? 1 : 0) || a.start - b.start);
  return (
    <div className="pl-waterfall">
      <div className="pl-toolbar">
        <button type="button" className="pl-ghost" onClick={back}>
          ← All traces
        </button>
        <p>
          <strong>{trace.name}</strong> at {clock(trace.t)}, {trace.duration >= 1000 ? `${(trace.duration / 1000).toFixed(2)} s` : `${Math.round(trace.duration)} ms`}
          {trace.error ? <span className="pl-badge-bad">{trace.error}</span> : null}
        </p>
      </div>
      <p className="pl-trace-attrs">
        {Object.entries(trace.attrs).map(([key, value]) => (
          <span key={key}>
            {key}=<strong>{String(value)}</strong>
          </span>
        ))}
      </p>
      <ol className="pl-spans">
        {ordered.map((span) => (
          <li key={span.id} data-error={span.error ? true : undefined}>
            <button type="button" onClick={() => setOpen(open === span.id ? null : span.id)} aria-expanded={open === span.id}>
              <span className="pl-span-name" style={{ paddingLeft: `${depth(span.id) * 14}px` }}>
                <span className="pl-span-service" data-service={span.service}>
                  {span.service}
                </span>
                {span.name}
              </span>
              <span className="pl-span-track">
                <span
                  className="pl-span-bar"
                  data-service={span.service}
                  style={{ left: `${(span.start / total) * 100}%`, width: `max(2px, ${(span.duration / total) * 100}%)` }}
                />
              </span>
              <span className="pl-num">{span.duration >= 1000 ? `${(span.duration / 1000).toFixed(2)} s` : `${span.duration < 1 ? span.duration.toFixed(1) : Math.round(span.duration)} ms`}</span>
            </button>
            {open === span.id ? (
              <dl className="pl-span-attrs">
                <div>
                  <dt>start</dt>
                  <dd>+{Math.round(span.start)} ms</dd>
                </div>
                {span.error ? (
                  <div>
                    <dt>error</dt>
                    <dd>{span.error}</dd>
                  </div>
                ) : null}
                {Object.entries(span.attrs ?? {}).map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{String(value)}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

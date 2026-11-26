"use client";

import { useMemo } from "react";
import { seriesPath } from "@/lib/sre/chart";
import { ServiceMark } from "@/components/learning/ServiceMark";
import type { Snapshot, TraceView } from "@/lib/sre/engine";
import { hostSignalLabel, targetLabel, type Controls } from "@/lib/sre/model";
import type { ServiceStory } from "@/lib/sre/stories";

export function TelemetryBoard({
  story,
  controls,
  snapshot,
  traceId,
  onTrace,
  hop,
  onHop,
}: {
  story: ServiceStory;
  controls: Controls;
  snapshot: Snapshot;
  traceId: string | null;
  onTrace: (id: string) => void;
  hop: "checkout" | "payment" | null;
  onHop: (hop: "checkout" | "payment") => void;
}) {
  const trace =
    snapshot.traces.find((item) => item.id === traceId) ??
    snapshot.traces[0] ??
    null;
  const window = snapshot.window;
  const goodText =
    window.goodRate === null
      ? "no samples"
      : `${(window.goodRate * 100).toFixed(1)}%`;
  const spentText =
    window.spent === null ? "no samples" : `${window.spent.toFixed(2)} budgets`;
  const hostLabel = hostSignalLabel(controls);
  const hostAlertTitle =
    controls.profile === "analytics" ? "Warehouse util over 80%" : "CPU over 80%";

  return (
    <div className="space-y-4">
      <section className="exp-panel">
        <p className="exp-kicker">{story.product}</p>
        <h2 className="mt-1 font-serif text-2xl text-[color:var(--exp-fg)]">
          {story.service} calls {story.dependency}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[color:var(--exp-muted)]">
          {/^[aeiou]/i.test(story.noun) ? "An" : "A"} {story.noun} reaches{" "}
          {story.service}. {story.service} calls {story.dependency}. The clock
          below is the only clock. The chart, the trace, the log, and the alerts
          are that same minute.
        </p>
        {controls.profile === "api" ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[color:var(--exp-muted)]">
            Failure knobs on this path: docs lag {controls.docsLagMs} ms, contract
            mismatches {Math.round(controls.contractMismatchRate * 100)}%.
          </p>
        ) : null}
        {controls.profile === "analytics" ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[color:var(--exp-muted)]">
            Failure knobs on this path: warehouse rejects{" "}
            {Math.round(controls.batchRejectRate * 100)}%, late-batch delay{" "}
            {controls.lateBatchMs} ms, warehouse util{" "}
            {Math.round(controls.warehouseUtil * 100)}%.
          </p>
        ) : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <ServiceCard label={story.client} detail={story.clientDetail} />
          <ServiceCard
            label={story.service}
            detail={`${story.path} · ${snapshot.httpVisible ? `${window.total} in the window` : "metrics off"}`}
          />
          <ServiceCard label={story.dependency} detail={story.dependencySpan} />
        </div>
      </section>

      <section className="exp-panel">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-serif text-lg text-[color:var(--exp-fg)]">
            Metrics
          </h3>
          <p className="font-mono text-[0.72rem] text-[color:var(--exp-muted)]">
            Target {targetLabel(controls.target)} · good {goodText}
          </p>
        </div>
        {snapshot.httpVisible ? (
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--exp-muted)]">
            {window.total === 0
              ? `No ${story.noun} has finished in this window yet.`
              : `${window.good} good and ${window.bad} bad out of ${window.total}. The target allows ${window.allowedBad.toFixed(1)} bad ${story.plural} in a window of this size. Spent ${spentText}.`}
          </p>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--exp-muted)]">
            HTTP metrics are off. The error line stays empty. That is missing
            telemetry, not a perfect hour.
          </p>
        )}
        <SeriesChart
          series={snapshot.series}
          service={story.service}
          hostLabel={hostLabel}
        />
        <dl className="mt-3 grid grid-cols-2 gap-2 font-mono text-[0.75rem] sm:grid-cols-4">
          <Stat
            label={hostLabel}
            value={
              snapshot.cpu === null
                ? "no sample"
                : `${Math.round(snapshot.cpu * 100)}%`
            }
          />
          <Stat
            label="Short burn"
            value={
              snapshot.shortBurn.burn === null
                ? "no samples"
                : snapshot.shortBurn.burn.toFixed(1)
            }
          />
          <Stat
            label="Long burn"
            value={
              snapshot.longBurn.burn === null
                ? "no samples"
                : snapshot.longBurn.burn.toFixed(1)
            }
          />
          <Stat label="Clock" value={`${snapshot.t.toFixed(0)}s`} />
        </dl>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="exp-panel">
          <h3 className="font-serif text-lg text-[color:var(--exp-fg)]">
            Trace
          </h3>
          {snapshot.traces.length === 0 ? (
            <p className="mt-2 text-sm leading-relaxed text-[color:var(--exp-muted)]">
              {controls.emitHttp
                ? `No trace yet. ${story.run}.`
                : `Telemetry for ${story.plural} is off, so there is no trace to open.`}
            </p>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
              <ul className="space-y-1">
                {snapshot.traces.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onTrace(item.id)}
                      className={`w-full rounded-lg border px-2 py-1.5 text-left font-mono text-[0.72rem] ${
                        trace?.id === item.id
                          ? "border-[color:var(--exp-fg)] text-[color:var(--exp-fg)]"
                          : "border-[color:var(--exp-line)] text-[color:var(--exp-muted)]"
                      }`}
                    >
                      {item.id} · {item.status}
                    </button>
                  </li>
                ))}
              </ul>
              {trace ? (
                <TraceDetail trace={trace} hop={hop} onHop={onHop} story={story} />
              ) : null}
            </div>
          )}
        </div>
        <div className="exp-panel">
          <h3 className="font-serif text-lg text-[color:var(--exp-fg)]">
            Logs
          </h3>
          {!controls.instrumentation.structuredLogs || !controls.emitHttp ? (
            <p className="mt-2 text-sm leading-relaxed text-[color:var(--exp-muted)]">
              {controls.emitHttp
                ? `Structured logs are off. A plain sentence would not carry the trace id or the ${story.dependency} time.`
                : `Telemetry for ${story.plural} is off, so no log line is being recorded.`}
            </p>
          ) : snapshot.logs.length === 0 ? (
            <p className="mt-2 text-sm leading-relaxed text-[color:var(--exp-muted)]">
              No log line in this window yet.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {snapshot.logs.map((log) => (
                <li
                  key={log.id}
                  className="overflow-x-auto rounded-lg bg-[color:var(--exp-chip)] px-2.5 py-2 font-mono text-[0.7rem] leading-relaxed text-[color:var(--exp-fg)]"
                >
                  {log.line}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <AlertCard title={hostAlertTitle} alert={snapshot.cpuAlert} />
        <AlertCard title={`${story.service} burn rate`} alert={snapshot.burnAlert} />
      </section>
    </div>
  );
}

function ServiceCard({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[color:var(--exp-line)] px-3 py-3">
      <ServiceMark label={label} />
      <div>
        <p className="font-serif text-base text-[color:var(--exp-fg)]">
          {label === "Pay" ? "Payment" : label}
        </p>
        <p className="text-xs leading-relaxed text-[color:var(--exp-muted)]">
          {detail}
        </p>
      </div>
    </div>
  );
}

const STAT_NOTES: Record<string, string> = {
  CPU: "CPU is how busy the host is. A high reading does not, by itself, mean customers are failing.",
  "Warehouse util":
    "Warehouse util is how busy the warehouse writers are. A high reading does not, by itself, mean ingest batches are failing.",
  "Short burn": "Short burn is the 12-second window against the 99.5 percent budget.",
  "Long burn": "Long burn is the 60-second window. A page waits until it agrees with the short window.",
  Clock: "Clock is simulation seconds, not wall time.",
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[color:var(--exp-line)] px-2.5 py-2">
      <dt className="text-[color:var(--exp-faint)]">
        <span className="hint hint-plain" tabIndex={0}>
          {label}
          <span className="hint-bubble" role="tooltip">
            {STAT_NOTES[label]}
          </span>
        </span>
      </dt>
      <dd className="mt-1 tabular-nums text-[color:var(--exp-fg)]">{value}</dd>
    </div>
  );
}

function TraceDetail({
  trace,
  hop,
  onHop,
  story,
}: {
  trace: TraceView;
  hop: "checkout" | "payment" | null;
  onHop: (hop: "checkout" | "payment") => void;
  story: ServiceStory;
}) {
  const linkedPayment = trace.spans.some(
    (span) => span.name === story.dependencySpan,
  );
  return (
    <div>
      <p className="font-mono text-[0.72rem] text-[color:var(--exp-muted)]">
        {trace.traceId} · {trace.checkoutMs.toFixed(0)} ms · HTTP {trace.status}
      </p>
      <ul className="mt-2 space-y-1.5">
        {trace.spans.map((span) => (
          <li
            key={span.name}
            className="rounded-lg border border-[color:var(--exp-line)] px-2.5 py-2 text-sm"
          >
            <span className="text-[color:var(--exp-fg)]">{span.name}</span>
            <span className="ml-2 font-mono text-[0.72rem] tabular-nums text-[color:var(--exp-muted)]">
              {span.ms.toFixed(0)} ms
            </span>
          </li>
        ))}
        {trace.unlinked.map((span) => (
          <li
            key={span.name}
            className="rounded-lg border border-dashed border-[color:var(--exp-line-strong)] px-2.5 py-2 text-sm text-[color:var(--exp-muted)]"
          >
            {span.name} · {span.ms.toFixed(0)} ms · not on this trace
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm leading-relaxed text-[color:var(--exp-muted)]">
        Which hop held the time?
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className={hopButton(hop === "checkout")}
          onClick={() => onHop("checkout")}
        >
          {story.handlerButton}
        </button>
        <button
          type="button"
          className={hopButton(hop === "payment")}
          onClick={() => onHop("payment")}
          disabled={!linkedPayment && trace.unlinked.length === 0}
        >
          {story.dependencyButton}
        </button>
      </div>
      {!linkedPayment && trace.unlinked.length > 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-[color:var(--exp-muted)]">
          The {story.dependency} span has no trace id in common with {story.service}, so it is not
          part of this trace yet.
        </p>
      ) : null}
    </div>
  );
}

function hopButton(on: boolean): string {
  return `exp-btn ${on ? "exp-btn-primary" : "exp-btn-ghost"} !min-h-9 !px-3 text-sm`;
}

function AlertCard({
  title,
  alert,
}: {
  title: string;
  alert: Snapshot["cpuAlert"];
}) {
  const tone =
    alert.status === "paging"
      ? "text-[color:var(--exp-accent-text)]"
      : alert.status === "no-data"
        ? "text-[color:var(--exp-amber-text)]"
        : "text-[color:var(--exp-fg)]";
  return (
    <div className="exp-panel">
      <h3 className="font-serif text-lg text-[color:var(--exp-fg)]">{title}</h3>
      <p
        className={`mt-2 font-mono text-[0.75rem] uppercase tracking-[0.12em] ${tone}`}
      >
        {alert.status === "paging"
          ? "Paging"
          : alert.status === "no-data"
            ? "No samples"
            : "Quiet"}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[color:var(--exp-muted)]">
        {alert.detail}
      </p>
    </div>
  );
}

function missCeilingFor(maxMiss: number): number {
  // Zoom the copper axis when the window is thin so 1.7% spend reads as a line, not dust.
  if (maxMiss <= 0.025) return 0.05;
  if (maxMiss <= 0.08) return 0.1;
  if (maxMiss <= 0.25) return 0.5;
  return 1;
}

function SeriesChart({
  series,
  service,
  hostLabel = "CPU",
}: {
  series: Snapshot["series"];
  service: string;
  hostLabel?: string;
}) {
  const drawing = useMemo(() => {
    const width = 640;
    const height = 180;
    const pad = { t: 12, r: 36, b: 22, l: 32 };
    const rows =
      series.length > 0 ? series : [{ t: 0, errorRate: null, cpu: null }];
    const from = rows[0]!.t;
    const to = Math.max(from + 1, rows[rows.length - 1]!.t);
    const missPeak = rows.reduce((max, row) => {
      if (row.errorRate == null || !Number.isFinite(row.errorRate)) return max;
      return Math.max(max, row.errorRate);
    }, 0);
    const missCeiling = missCeilingFor(missPeak);
    const x = (t: number) =>
      pad.l + ((t - from) / (to - from)) * (width - pad.l - pad.r);
    const yHost = (value: number) =>
      height - pad.b - value * (height - pad.t - pad.b);
    const yMiss = (value: number) =>
      height -
      pad.b -
      (value / missCeiling) * (height - pad.t - pad.b);
    const yBase = height - pad.b;
    const missMarks = rows
      .filter((row) => row.errorRate != null && row.errorRate > 0)
      .map((row) => ({
        cx: x(row.t),
        cy: yMiss(row.errorRate ?? 0),
        y0: yBase,
      }));
    const missTicks =
      missCeiling <= 0.05
        ? [0, 0.025, 0.05]
        : missCeiling <= 0.1
          ? [0, 0.05, 0.1]
          : missCeiling <= 0.5
            ? [0, 0.25, 0.5]
            : [0, 0.5, 1];
    return {
      width,
      height,
      pad,
      errors: seriesPath(rows, (row) => row.errorRate, x, yMiss),
      cpu: seriesPath(rows, (row) => row.cpu, x, yHost),
      missMarks,
      missCeiling,
      missTicks,
      from,
      to,
      y80: yHost(0.8),
      zoomed: missCeiling < 1,
    };
  }, [series]);

  const missScaleLabel =
    drawing.missCeiling < 1
      ? `Miss scale 0–${Math.round(drawing.missCeiling * 100)}% (copper, right)`
      : "Miss scale 0–100% (copper)";

  return (
    <figure>
      <figcaption className="mt-3 text-xs text-[color:var(--exp-muted)]">
        {service} SLI misses (copper) and {hostLabel.toLowerCase()} (teal).{" "}
        {missScaleLabel}; host stays 0–100% (left). One-second samples. A late
        200 counts as a miss when the line includes latency. Gaps indicate
        missing measurements.
      </figcaption>
      <svg
        viewBox={`0 0 ${drawing.width} ${drawing.height}`}
        className="mt-3 h-auto w-full"
        role="img"
        aria-label={`${service} SLI miss rate on a ${Math.round(drawing.missCeiling * 100)} percent scale and ${hostLabel} over the last minute`}
      >
        {[0, 50, 100].map((value) => (
          <g key={`host-${value}`}>
            <line
              x1={drawing.pad.l}
              x2={drawing.width - drawing.pad.r}
              y1={158 - (value / 100) * 146}
              y2={158 - (value / 100) * 146}
              stroke="var(--exp-line)"
            />
            <text
              x={0}
              y={162 - (value / 100) * 146}
              fill="var(--exp-muted)"
              fontSize={10}
            >
              {value}%
            </text>
          </g>
        ))}
        {drawing.missTicks.map((tick) => (
          <text
            key={`miss-${tick}`}
            x={drawing.width - 2}
            y={162 - (tick / drawing.missCeiling) * 146}
            textAnchor="end"
            fill="var(--exp-accent)"
            fontSize={10}
          >
            {tick < 0.1
              ? `${(tick * 100).toFixed(1)}%`
              : `${Math.round(tick * 100)}%`}
          </text>
        ))}
        <text x={drawing.pad.l} y={178} fill="var(--exp-muted)" fontSize={10}>
          {drawing.from}s
        </text>
        <text
          x={drawing.width - drawing.pad.r}
          y={178}
          textAnchor="end"
          fill="var(--exp-muted)"
          fontSize={10}
        >
          {drawing.to}s
        </text>
        <line
          x1={drawing.pad.l}
          x2={drawing.width - drawing.pad.r}
          y1={drawing.y80}
          y2={drawing.y80}
          stroke="var(--exp-line-strong)"
          strokeDasharray="3 4"
        />
        {drawing.cpu ? (
          <path
            d={drawing.cpu}
            fill="none"
            stroke="var(--exp-amber-text)"
            strokeWidth={1.6}
          />
        ) : null}
        {drawing.errors ? (
          <path
            d={drawing.errors}
            fill="none"
            stroke="var(--exp-accent)"
            strokeWidth={1.8}
          />
        ) : null}
        {drawing.missMarks.map((mark, index) => (
          <g key={`${mark.cx}-${index}`}>
            {drawing.zoomed ? (
              <line
                x1={mark.cx}
                x2={mark.cx}
                y1={mark.y0}
                y2={mark.cy}
                stroke="var(--exp-accent)"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            ) : null}
            <circle
              cx={mark.cx}
              cy={mark.cy}
              r={drawing.zoomed ? 3.1 : 2.6}
              fill="var(--exp-accent)"
            />
          </g>
        ))}
      </svg>
    </figure>
  );
}

"use client";

import { useMemo } from "react";
import { seriesPath } from "@/lib/sre/chart";
import { ServiceMark } from "@/components/learning/ServiceMark";
import type { Snapshot, TraceView } from "@/lib/sre/engine";
import { targetLabel, type Controls } from "@/lib/sre/model";

export function TelemetryBoard({
  controls,
  snapshot,
  traceId,
  onTrace,
  hop,
  onHop,
}: {
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

  return (
    <div className="space-y-4">
      <section className="exp-panel">
        <p className="exp-kicker">Checkout</p>
        <h2 className="mt-1 font-serif text-2xl text-[color:var(--exp-fg)]">
          One payment call
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[color:var(--exp-muted)]">
          A shopper hits checkout. Checkout calls payment. The clock below is
          the only clock. The chart, the trace, the log, and the alerts are that
          same minute.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <ServiceCard label="Client" detail="Starts the checkout" />
          <ServiceCard
            label="Checkout"
            detail={`POST /checkout · ${snapshot.httpVisible ? `${window.total} in the window` : "metrics off"}`}
          />
          <ServiceCard label="Pay" detail="payment charge" />
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
              ? "No checkout has finished in this window yet."
              : `${window.good} good and ${window.bad} bad out of ${window.total}. The target allows ${window.allowedBad.toFixed(1)} bad checkouts in a window of this size. Spent ${spentText}.`}
          </p>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--exp-muted)]">
            HTTP metrics are off. The error line stays empty. That is missing
            telemetry, not a perfect hour.
          </p>
        )}
        <SeriesChart series={snapshot.series} />
        <dl className="mt-3 grid grid-cols-2 gap-2 font-mono text-[0.75rem] sm:grid-cols-4">
          <Stat
            label="CPU"
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
                ? "No trace yet. Run the checkout."
                : "Checkout telemetry is off, so there is no trace to open."}
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
                <TraceDetail trace={trace} hop={hop} onHop={onHop} />
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
                ? "Structured logs are off. A plain sentence would not carry the trace id or the payment time."
                : "Checkout telemetry is off, so no log line is being recorded."}
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
        <AlertCard title="CPU over 80%" alert={snapshot.cpuAlert} />
        <AlertCard title="Checkout burn rate" alert={snapshot.burnAlert} />
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[color:var(--exp-line)] px-2.5 py-2">
      <dt className="text-[color:var(--exp-faint)]">{label}</dt>
      <dd className="mt-1 tabular-nums text-[color:var(--exp-fg)]">{value}</dd>
    </div>
  );
}

function TraceDetail({
  trace,
  hop,
  onHop,
}: {
  trace: TraceView;
  hop: "checkout" | "payment" | null;
  onHop: (hop: "checkout" | "payment") => void;
}) {
  const linkedPayment = trace.spans.some(
    (span) => span.name === "payment charge",
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
          Checkout handler
        </button>
        <button
          type="button"
          className={hopButton(hop === "payment")}
          onClick={() => onHop("payment")}
          disabled={!linkedPayment && trace.unlinked.length === 0}
        >
          Payment charge
        </button>
      </div>
      {!linkedPayment && trace.unlinked.length > 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-[color:var(--exp-muted)]">
          The payment span has no trace id in common with checkout, so it is not
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

function SeriesChart({ series }: { series: Snapshot["series"] }) {
  const drawing = useMemo(() => {
    const width = 640;
    const height = 180;
    const pad = { t: 12, r: 12, b: 22, l: 32 };
    const rows =
      series.length > 0 ? series : [{ t: 0, errorRate: null, cpu: null }];
    const from = rows[0]!.t;
    const to = Math.max(from + 1, rows[rows.length - 1]!.t);
    const x = (t: number) =>
      pad.l + ((t - from) / (to - from)) * (width - pad.l - pad.r);
    const y = (value: number) =>
      height - pad.b - value * (height - pad.t - pad.b);
    return {
      width,
      height,
      errors: seriesPath(rows, (row) => row.errorRate, x, y),
      cpu: seriesPath(rows, (row) => row.cpu, x, y),
      from,
      to,
      y80: y(0.8),
    };
  }, [series]);

  return (
    <figure>
      <figcaption className="mt-3 text-xs text-[color:var(--exp-muted)]">
        Checkout errors (copper) and CPU (teal), % · one-second samples. Gaps
        indicate missing measurements.
      </figcaption>
      <svg
        viewBox={`0 0 ${drawing.width} ${drawing.height}`}
        className="mt-3 h-auto w-full"
        role="img"
        aria-label="Checkout error rate and CPU over the last minute"
      >
        {[0, 50, 100].map((value) => (
          <g key={value}>
            <line
              x1={32}
              x2={628}
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
        <text x={32} y={178} fill="var(--exp-muted)" fontSize={10}>
          {drawing.from}s
        </text>
        <text
          x={628}
          y={178}
          textAnchor="end"
          fill="var(--exp-muted)"
          fontSize={10}
        >
          {drawing.to}s
        </text>
        <line
          x1={32}
          x2={628}
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
      </svg>
    </figure>
  );
}

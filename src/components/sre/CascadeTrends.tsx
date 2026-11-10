"use client";

import { useState } from "react";
import type { CascadeSample } from "@/lib/experience/cascade";
import { seriesPath } from "@/lib/sre/chart";

export function CascadeTrends({ samples }: { samples: CascadeSample[] }) {
  const [seconds, setSeconds] = useState(20);
  const last = samples.at(-1)?.t ?? 0;
  const rows = samples.filter((row) => row.t >= last - seconds);
  const from = rows[0]?.t ?? 0;
  const to = Math.max(from + 0.25, last);
  const x = (t: number) => 42 + ((t - from) / (to - from)) * 574;
  const ratioY = (value: number) => 132 - value * 108;
  const maxLatency = Math.max(
    100,
    Math.ceil(Math.max(...rows.map((row) => row.gatewayP99Ms), 0) / 200) * 200,
  );
  const latencyY = (value: number) => 132 - (value / maxLatency) * 108;
  const lastRow = rows.at(-1);
  return (
    <div className="telemetry-trends">
      <div className="trend-toolbar">
        <h3>Checkout evidence</h3>
        <label>
          History
          <select
            aria-label="Chart time range"
            value={seconds}
            onChange={(event) => setSeconds(Number(event.target.value))}
          >
            <option value={5}>Last 5s</option>
            <option value={10}>Last 10s</option>
            <option value={20}>Last 20s</option>
          </select>
        </label>
      </div>
      <p className="trend-summary">
        {lastRow
          ? `At ${lastRow.t.toFixed(1)}s: success ${lastRow.successRate == null ? "not measured" : `${(lastRow.successRate * 100).toFixed(1)}%`}, provider slots ${(lastRow.providerUtilization * 100).toFixed(0)}% full, checkout p99 ${Math.round(lastRow.gatewayP99Ms)} ms. Each point summarizes the trailing 5 seconds.`
          : "Step or play the clock to collect measurements. Missing success samples stay empty."}
      </p>
      {rows.length > 1 ? (
        <>
          <figure className="evidence-chart">
            <figcaption>
              <span>
                <i className="ink-success" /> Checkout success
              </span>
              <span>
                <i className="ink-slots" /> Provider slots
              </span>
              <small>% · trailing 5s</small>
            </figcaption>
            <svg
              viewBox="0 0 640 160"
              role="img"
              aria-label="Checkout success and provider utilization percentages over simulation time"
            >
              {[0, 0.5, 1].map((value) => (
                <g key={value}>
                  <line
                    x1={42}
                    x2={616}
                    y1={ratioY(value)}
                    y2={ratioY(value)}
                  />
                  <text x={3} y={ratioY(value) + 4}>
                    {value * 100}%
                  </text>
                </g>
              ))}
              <line
                className="chart-threshold"
                x1={42}
                x2={616}
                y1={ratioY(0.95)}
                y2={ratioY(0.95)}
              />
              <path
                className="chart-success"
                d={seriesPath(rows, (row) => row.successRate, x, ratioY)}
              />
              <path
                className="chart-slots"
                d={seriesPath(
                  rows,
                  (row) => row.providerUtilization,
                  x,
                  ratioY,
                )}
              />
              {rows.map((row) =>
                row.successRate == null ? null : (
                  <circle
                    key={row.t}
                    cx={x(row.t)}
                    cy={ratioY(row.successRate)}
                    r={2}
                    className="chart-point"
                  >
                    <title>
                      {row.t.toFixed(2)}s: checkout success{" "}
                      {(row.successRate * 100).toFixed(1)}%, provider slots{" "}
                      {(row.providerUtilization * 100).toFixed(1)}%
                    </title>
                  </circle>
                ),
              )}
              <text x={42} y={154}>
                {from.toFixed(1)}s
              </text>
              <text x={616} y={154} textAnchor="end">
                {to.toFixed(1)}s
              </text>
            </svg>
            <p className="chart-note">
              Dashed line: 95% success objective. Gaps mean no finished
              checkouts.
            </p>
          </figure>
          <figure className="evidence-chart">
            <figcaption>
              <span>Checkout latency p99</span>
              <small>ms · finished checkouts in trailing 5s</small>
            </figcaption>
            <svg
              viewBox="0 0 640 160"
              role="img"
              aria-label="Checkout p99 latency in milliseconds over simulation time"
            >
              {[0, 0.5, 1].map((fraction) => (
                <g key={fraction}>
                  <line
                    x1={42}
                    x2={616}
                    y1={latencyY(fraction * maxLatency)}
                    y2={latencyY(fraction * maxLatency)}
                  />
                  <text x={3} y={latencyY(fraction * maxLatency) + 4}>
                    {Math.round(fraction * maxLatency)}
                  </text>
                </g>
              ))}
              <path
                className="chart-latency"
                d={seriesPath(
                  rows,
                  (row) => (row.successRate == null ? null : row.gatewayP99Ms),
                  x,
                  latencyY,
                )}
              />
              <text x={42} y={154}>
                {from.toFixed(1)}s
              </text>
              <text x={616} y={154} textAnchor="end">
                {to.toFixed(1)}s
              </text>
            </svg>
          </figure>
        </>
      ) : null}
      <details className="chart-data">
        <summary>Exact recent measurements</summary>
        <div className="chart-table-scroll">
          <table>
            <caption>Latest ten samples; time is simulation seconds</caption>
            <thead>
              <tr>
                <th scope="col">Time (s)</th>
                <th scope="col">Success (%)</th>
                <th scope="col">Slots (%)</th>
                <th scope="col">Checkout p99 (ms)</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(-10).map((row) => (
                <tr key={row.t}>
                  <td>{row.t.toFixed(2)}</td>
                  <td>
                    {row.successRate == null
                      ? "No samples"
                      : (row.successRate * 100).toFixed(1)}
                  </td>
                  <td>{(row.providerUtilization * 100).toFixed(1)}</td>
                  <td>
                    {row.successRate == null
                      ? "No samples"
                      : row.gatewayP99Ms.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

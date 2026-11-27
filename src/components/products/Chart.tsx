"use client";

import { useId, useState } from "react";
import { shortClock, type Marker } from "@/lib/products/telemetry";
import type { ChartSpec } from "@/lib/products/types";

const W = 560;
const H = 132;
const PAD = { left: 40, right: 10, top: 16, bottom: 20 };
const BUCKET = 15_000;

function format(value: number, unit: ChartSpec["unit"]) {
  if (unit === "%") return `${value < 10 ? value.toFixed(1) : value.toFixed(0)}%`;
  if (unit === "ms") return value >= 1000 ? `${(value / 1000).toFixed(1)} s` : `${Math.round(value)} ms`;
  if (unit === "/min") return `${value.toFixed(0)}/min`;
  if (unit === "×") return `${value.toFixed(1)}×`;
  return value.toFixed(value < 10 && value % 1 ? 1 : 0);
}

export function Chart({ spec: raw, markers, now }: { spec: ChartSpec; markers: Marker[]; now: number }) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const from = now - 20 * 60_000;
  const spec = { ...raw, series: raw.series.map((series) => ({ ...series, points: series.points.filter((point) => point.t + BUCKET <= now) })) };
  const values = spec.series.flatMap((series) => series.points.map((point) => point.v ?? NaN)).filter(Number.isFinite);
  const top = Math.max(...values, spec.threshold?.value ?? 0, 1);
  const [lo, hi] = spec.domain ?? [0, top * 1.15];
  const yMax = spec.domain ? Math.max(hi, Math.min(top * 1.05, hi * 2)) : hi;
  const x = (t: number) => PAD.left + ((t - from) / (now - from)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - (Math.min(Math.max(v, lo), yMax) - lo) / (yMax - lo || 1)) * (H - PAD.top - PAD.bottom);
  const ticks = [lo, lo + (yMax - lo) / 2, yMax];
  const times: number[] = [];
  for (let t = Math.ceil(from / 300_000) * 300_000; t < now; t += 300_000) times.push(t);
  const paths = spec.series.map((series) => {
    let d = "";
    let open = false;
    for (const point of series.points) {
      if (point.v === null || point.t < from) {
        open = false;
        continue;
      }
      d += `${open ? "L" : "M"}${x(point.t + 7_500).toFixed(1)},${y(point.v).toFixed(1)}`;
      open = true;
    }
    return d;
  });
  const reference = spec.series[0]?.points ?? [];
  const hovered = hover === null ? null : reference.reduce<number | null>((best, point, index) => {
    if (best === null) return index;
    return Math.abs(x(point.t + 7_500) - hover) < Math.abs(x(reference[best].t + 7_500) - hover) ? index : best;
  }, null);
  const visibleMarkers = markers.filter((marker) => marker.t >= from && marker.t <= now);
  return (
    <figure className="pl-chart" aria-labelledby={`${id}-title`}>
      <figcaption>
        <div className="pl-chart-head">
          <h3 id={`${id}-title`}>{spec.title}</h3>
          <ul className="pl-legend">
            {spec.series.map((series) => {
              const last = [...series.points].reverse().find((point) => point.v !== null);
              const point = hovered !== null ? series.points[hovered] : last;
              return (
                <li key={series.label} data-tone={series.tone}>
                  <span aria-hidden="true" />
                  {series.label}
                  <strong>{point?.v != null ? format(point.v, spec.unit) : "–"}</strong>
                </li>
              );
            })}
          </ul>
        </div>
        <p>{spec.help}</p>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${spec.title}, last 20 minutes`}
        onPointerMove={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          setHover(((event.clientX - box.left) / box.width) * W);
        }}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} className="pl-grid" />
            <text x={PAD.left - 6} y={y(tick) + 3} className="pl-axis" textAnchor="end">
              {format(tick, spec.unit)}
            </text>
          </g>
        ))}
        {times.map((t) => (
          <text key={t} x={x(t)} y={H - 5} className="pl-axis" textAnchor="middle">
            {shortClock(t)}
          </text>
        ))}
        {spec.threshold ? (
          <g className="pl-threshold">
            <line x1={PAD.left} x2={W - PAD.right} y1={y(spec.threshold.value)} y2={y(spec.threshold.value)} />
            <text x={PAD.left + 4} y={y(spec.threshold.value) - 4}>
              {spec.threshold.label}
            </text>
          </g>
        ) : null}
        {visibleMarkers.map((marker) => (
          <g key={`${marker.t}-${marker.label}`} className="pl-marker">
            <line x1={x(marker.t)} x2={x(marker.t)} y1={PAD.top - 6} y2={H - PAD.bottom} />
            <text
              x={x(marker.t) > W * 0.75 ? x(marker.t) - 4 : x(marker.t) + 4}
              y={PAD.top + 2}
              textAnchor={x(marker.t) > W * 0.75 ? "end" : "start"}
            >
              {marker.label}
            </text>
            <title>{`${shortClock(marker.t)} ${marker.label}`}</title>
          </g>
        ))}
        {paths.map((d, index) => (
          <path key={spec.series[index].label} d={d} className="pl-line" data-tone={spec.series[index].tone} />
        ))}
        {hovered !== null ? (
          <g className="pl-cursor">
            <line x1={x(reference[hovered].t + 7_500)} x2={x(reference[hovered].t + 7_500)} y1={PAD.top} y2={H - PAD.bottom} />
            <text x={x(reference[hovered].t + 7_500)} y={PAD.top - 5} textAnchor="middle">
              {shortClock(reference[hovered].t)}
            </text>
          </g>
        ) : null}
      </svg>
    </figure>
  );
}

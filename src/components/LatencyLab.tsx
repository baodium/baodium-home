"use client";

import { useId, useMemo, useState } from "react";
import { Reveal } from "@/components/Reveal";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

/**
 * Interactive beat: connection-demand calculator + latency scrub chart.
 * Assumptions (stated in UI):
 * - Steady request rate λ (req/s)
 * - Mean occupancy W (ms) while holding a connection / worker
 * - Little’s Law: L = λ × (W / 1000) concurrent holders
 * - p99 occupancy ≈ p50 × stretch; stretch is a teaching knob, not a fitted model
 * - No queueing delay, retries, or pool exhaustion modeled
 */

const WIDTH = 640;
const HEIGHT = 220;
const PAD = { t: 18, r: 16, b: 28, l: 40 };

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function sampleCurve(p50Ms: number, stretch: number, points = 48) {
  // Synthetic latency samples around p50 with a heavy tail toward p99.
  const p99 = p50Ms * stretch;
  return Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    // Mix of base occupancy and tail spikes — teaching shape, not telemetry.
    const base = p50Ms * (0.72 + 0.28 * Math.sin(t * Math.PI * 2.4));
    const spike = t > 0.62 && t < 0.78 ? (p99 - p50Ms) * (1 - Math.abs(t - 0.7) / 0.08) : 0;
    return Math.max(4, base + spike * 0.85);
  });
}

export function LatencyLab() {
  const rateId = useId();
  const occId = useId();
  const stretchId = useId();
  const reduced = usePrefersReducedMotion();

  const [rate, setRate] = useState(120);
  const [occupancy, setOccupancy] = useState(35);
  const [stretch, setStretch] = useState(4.2);
  const [scrub, setScrub] = useState(0.7);

  const samples = useMemo(
    () => sampleCurve(occupancy, stretch),
    [occupancy, stretch],
  );

  const demand = rate * (occupancy / 1000);
  const demandP99 = rate * ((occupancy * stretch) / 1000);
  const scrubIndex = Math.round(scrub * (samples.length - 1));
  const scrubLatency = samples[scrubIndex] ?? occupancy;

  const plot = useMemo(() => {
    const innerW = WIDTH - PAD.l - PAD.r;
    const innerH = HEIGHT - PAD.t - PAD.b;
    const maxY = Math.max(...samples, occupancy * stretch) * 1.08;
    const coords = samples.map((y, i) => {
      const x = PAD.l + (i / (samples.length - 1)) * innerW;
      const py = PAD.t + innerH - (y / maxY) * innerH;
      return { x, y: py, raw: y };
    });
    const d = coords
      .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
      .join(" ");
    const area = `${d} L ${coords.at(-1)!.x.toFixed(1)} ${(PAD.t + innerH).toFixed(1)} L ${coords[0]!.x.toFixed(1)} ${(PAD.t + innerH).toFixed(1)} Z`;
    const scrubX = PAD.l + scrub * innerW;
    const p50Y = PAD.t + innerH - (occupancy / maxY) * innerH;
    const p99Y = PAD.t + innerH - ((occupancy * stretch) / maxY) * innerH;
    return { d, area, scrubX, p50Y, p99Y, innerH, maxY, coords };
  }, [samples, scrub, occupancy, stretch]);

  return (
    <section id="lab" aria-labelledby="lab-heading" className="section">
      <Reveal>
        <div className="shell">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-5">
              <h2
                id="lab-heading"
                className="font-sans text-[0.72rem] font-medium uppercase tracking-[0.22em] text-bronze"
              >
                Latency lab
              </h2>
              <p className="mt-6 font-serif text-3xl leading-snug tracking-[-0.02em] md:text-4xl">
                How many connections does that request rate really need?
              </p>
              <p className="mt-5 max-w-md leading-relaxed text-muted">
                Drag the knobs. Demand follows Little&apos;s Law from{" "}
                <em className="text-bronze">Practical System Design</em> — occupancy time
                turns arrival rate into concurrent holders.
              </p>

              <div className="mt-10 space-y-7">
                <label className="block" htmlFor={rateId}>
                  <span className="flex justify-between text-[0.78rem] tracking-wide text-faint">
                    Request rate
                    <span className="tabular-nums text-ink">{rate} req/s</span>
                  </span>
                  <input
                    id={rateId}
                    className="lab-slider mt-3"
                    type="range"
                    min={10}
                    max={400}
                    step={5}
                    value={rate}
                    onChange={(e) => setRate(Number(e.target.value))}
                  />
                </label>
                <label className="block" htmlFor={occId}>
                  <span className="flex justify-between text-[0.78rem] tracking-wide text-faint">
                    p50 occupancy
                    <span className="tabular-nums text-ink">{occupancy} ms</span>
                  </span>
                  <input
                    id={occId}
                    className="lab-slider mt-3"
                    type="range"
                    min={5}
                    max={200}
                    step={1}
                    value={occupancy}
                    onChange={(e) => setOccupancy(Number(e.target.value))}
                  />
                </label>
                <label className="block" htmlFor={stretchId}>
                  <span className="flex justify-between text-[0.78rem] tracking-wide text-faint">
                    p99 / p50 stretch
                    <span className="tabular-nums text-ink">{stretch.toFixed(1)}×</span>
                  </span>
                  <input
                    id={stretchId}
                    className="lab-slider mt-3"
                    type="range"
                    min={1.5}
                    max={12}
                    step={0.1}
                    value={stretch}
                    onChange={(e) => setStretch(Number(e.target.value))}
                  />
                </label>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-4 border border-line p-5">
                <div>
                  <p className="text-[0.68rem] uppercase tracking-[0.16em] text-faint">
                    Concurrent @ p50
                  </p>
                  <p className="mt-2 font-serif text-3xl tabular-nums tracking-tight text-ink">
                    {demand.toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-[0.68rem] uppercase tracking-[0.16em] text-faint">
                    Concurrent @ p99
                  </p>
                  <p className="mt-2 font-serif text-3xl tabular-nums tracking-tight text-bronze">
                    {demandP99.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="border border-line bg-raise p-4 md:p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <p className="text-[0.72rem] uppercase tracking-[0.18em] text-faint">
                    Occupancy over a window
                  </p>
                  <p className="text-sm tabular-nums text-muted">
                    Scrub · {scrubLatency.toFixed(0)} ms
                  </p>
                </div>
                <svg
                  viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                  className="mt-4 h-auto w-full"
                  role="img"
                  aria-label="Latency distribution chart with p50 and p99 guides"
                >
                  <defs>
                    <linearGradient id="labFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c4a27a" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#c4a27a" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d={plot.area}
                    fill="url(#labFill)"
                    style={
                      reduced
                        ? undefined
                        : { transition: "d 0.35s cubic-bezier(0.22, 1, 0.36, 1)" }
                    }
                  />
                  <path
                    d={plot.d}
                    fill="none"
                    stroke="#c4a27a"
                    strokeWidth="2"
                    style={
                      reduced
                        ? undefined
                        : { transition: "d 0.35s cubic-bezier(0.22, 1, 0.36, 1)" }
                    }
                  />
                  <line
                    x1={PAD.l}
                    x2={WIDTH - PAD.r}
                    y1={plot.p50Y}
                    y2={plot.p50Y}
                    stroke="rgba(243,239,232,0.28)"
                    strokeDasharray="4 5"
                  />
                  <line
                    x1={PAD.l}
                    x2={WIDTH - PAD.r}
                    y1={plot.p99Y}
                    y2={plot.p99Y}
                    stroke="rgba(184,115,74,0.55)"
                    strokeDasharray="4 5"
                  />
                  <text x={PAD.l + 4} y={plot.p50Y - 6} fill="#8a827a" fontSize="11">
                    p50
                  </text>
                  <text x={PAD.l + 4} y={plot.p99Y - 6} fill="#b8734a" fontSize="11">
                    p99
                  </text>
                  <line
                    x1={plot.scrubX}
                    x2={plot.scrubX}
                    y1={PAD.t}
                    y2={PAD.t + plot.innerH}
                    stroke="#f3efe8"
                    strokeOpacity="0.55"
                  />
                  <circle
                    cx={plot.scrubX}
                    cy={
                      plot.coords[scrubIndex]?.y ?? plot.p50Y
                    }
                    r="5"
                    fill="#0c0b0a"
                    stroke="#c4a27a"
                    strokeWidth="2"
                  />
                </svg>
                <label className="mt-2 block" htmlFor={`${stretchId}-scrub`}>
                  <span className="sr-only">Scrub the latency window</span>
                  <input
                    id={`${stretchId}-scrub`}
                    className="lab-slider"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={scrub}
                    onChange={(e) => setScrub(clamp(Number(e.target.value), 0, 1))}
                  />
                </label>
              </div>

              <details className="mt-5 border border-line p-4 text-sm leading-relaxed text-muted open:pb-5">
                <summary className="cursor-pointer text-ink">Assumptions</summary>
                <ul className="mt-3 list-disc space-y-2 pl-5">
                  <li>
                    Steady arrival rate λ and mean occupancy W; concurrent demand L = λ × W
                    (Little&apos;s Law).
                  </li>
                  <li>
                    Chart samples are synthetic teaching shapes around your p50, with a
                    stretch knob for a p99-like tail — not production telemetry.
                  </li>
                  <li>
                    No queue wait, retries, timeouts, or pool exhaustion. Those raise demand
                    further in real systems.
                  </li>
                </ul>
              </details>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

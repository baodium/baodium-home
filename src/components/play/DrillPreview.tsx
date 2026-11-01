"use client";

import { motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";
import type { PlayGame } from "@/data/play-games";

type Tone = "ok" | "warn" | "bad";

const toneClass: Record<Tone, string> = {
  ok: "text-[color:var(--drill-signal,#2f7a7e)]",
  warn: "text-[color:var(--drill-warn,#b45309)]",
  bad: "text-cinnabar",
};

const barClass: Record<Tone, string> = {
  ok: "bg-[color:var(--drill-signal,#2f7a7e)]",
  warn: "bg-[color:var(--drill-warn,#b45309)]",
  bad: "bg-cinnabar",
};

/**
 * Live mini-metric preview of a drill’s failure mode — labeled numbers + sparkline,
 * not abstract decorative bars.
 */
export function DrillPreview({
  game,
  active = true,
  size = "md",
}: {
  game: PlayGame;
  active?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const reduce = usePrefersReducedMotion();
  const run = active && !reduce;
  const { preview } = game;
  const pad = size === "lg" ? "p-4 md:p-5" : size === "sm" ? "p-2.5" : "p-3.5";
  const titleSize = size === "sm" ? "text-[0.68rem]" : "text-[0.72rem]";
  const valueSize =
    size === "lg"
      ? "text-[1.35rem] md:text-[1.55rem]"
      : size === "sm"
        ? "text-[1.05rem]"
        : "text-[1.2rem] md:text-[1.35rem]";

  return (
    <div
      className={`relative flex h-full w-full flex-col justify-between overflow-hidden rounded-xl border border-ink/10 bg-[#fbfcfe] ${pad}`}
      aria-hidden="true"
    >
      <div className="flex items-start justify-between gap-3">
        <Metric
          label={preview.primary.label}
          value={preview.primary.value}
          tone={preview.primary.tone}
          valueSize={valueSize}
          titleSize={titleSize}
          run={run}
          emphasize
        />
        <Metric
          label={preview.secondary.label}
          value={preview.secondary.value}
          tone={preview.secondary.tone}
          valueSize={size === "sm" ? "text-[0.95rem]" : "text-[1.05rem] md:text-[1.15rem]"}
          titleSize={titleSize}
          run={run}
          delay={0.15}
        />
      </div>

      <Sparkline
        values={preview.spark}
        tone={preview.primary.tone}
        run={run}
        tall={size === "lg"}
      />

      <p
        className={`font-mono ${titleSize} uppercase tracking-[0.14em] text-[color:var(--drill-muted,#5b6778)]`}
      >
        {preview.caption}
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
  valueSize,
  titleSize,
  run,
  delay = 0,
  emphasize,
}: {
  label: string;
  value: string;
  tone: Tone;
  valueSize: string;
  titleSize: string;
  run: boolean;
  delay?: number;
  emphasize?: boolean;
}) {
  return (
    <div className={emphasize ? "min-w-0 flex-1" : "min-w-0 shrink-0 text-right"}>
      <p
        className={`font-mono ${titleSize} uppercase tracking-[0.14em] text-[color:var(--drill-muted,#5b6778)]`}
      >
        {label}
      </p>
      <motion.p
        className={`mt-1 font-serif tabular-nums tracking-[-0.03em] ${valueSize} ${toneClass[tone]}`}
        animate={run ? { opacity: [0.7, 1, 0.85, 1] } : undefined}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay }}
      >
        {value}
      </motion.p>
    </div>
  );
}

function Sparkline({
  values,
  tone,
  run,
  tall,
}: {
  values: number[];
  tone: Tone;
  run: boolean;
  tall?: boolean;
}) {
  const h = tall ? 44 : 32;
  const w = 160;
  const step = w / Math.max(1, values.length - 1);
  const coords = values.map((v, i) => {
    const x = i * step;
    const y = h - Math.max(0.08, Math.min(1, v)) * (h - 4);
    return { x, y, v };
  });
  const d = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");
  const last = coords[coords.length - 1] ?? { x: 0, y: h / 2, v: 0.5 };

  return (
    <div className="relative my-2 w-full" style={{ height: h }}>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="none">
        <line
          x1="0"
          y1={h * 0.35}
          x2={w}
          y2={h * 0.35}
          className="stroke-ink/10"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        {coords.map((c, i) => (
          <motion.rect
            key={i}
            x={c.x - 3}
            width="6"
            rx="1"
            className={`${barClass[tone]} opacity-25`}
            initial={false}
            animate={
              run
                ? {
                    y: h - Math.max(0.08, c.v) * (h - 4),
                    height: Math.max(0.08, c.v) * (h - 4),
                    opacity: i === coords.length - 1 ? [0.35, 0.7, 0.35] : 0.22,
                  }
                : {
                    y: h - Math.max(0.08, c.v) * (h - 4),
                    height: Math.max(0.08, c.v) * (h - 4),
                  }
            }
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.05 }}
          />
        ))}
        <motion.path
          d={d}
          fill="none"
          className={tone === "ok" ? "stroke-[color:var(--drill-signal,#2f7a7e)]" : "stroke-cinnabar"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={run ? { pathLength: [0.55, 1, 0.7, 1] } : { pathLength: 1 }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.circle
          cx={last.x}
          cy={last.y}
          r="3.5"
          className={barClass[tone]}
          animate={run ? { opacity: [0.5, 1, 0.5] } : undefined}
          transition={{ duration: 1.6, repeat: Infinity }}
        />
      </svg>
    </div>
  );
}

export function previewKindForSlug(
  slug: string,
): "slo" | "surge" | "cascade" | "cache" | "tail" {
  if (slug === "slo-watch") return "slo";
  if (slug === "traffic-surge") return "surge";
  if (slug === "cascade") return "cascade";
  if (slug === "cache-roulette") return "cache";
  return "tail";
}

"use client";

import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { Segmented } from "@/components/ui/Segmented";

export function SimControls({
  running,
  speed,
  logicalTimeSec,
  seed,
  onPlayPause,
  onStep,
  onReplay,
  onSpeed,
  reducedMotion,
}: {
  running: boolean;
  speed: number;
  /** Shared sim clock (logical seconds). */
  logicalTimeSec?: number;
  /** Seed for a repeatable replay of this incident. */
  seed?: number;
  onPlayPause: () => void;
  onStep: () => void;
  onReplay: () => void;
  onSpeed: (s: number) => void;
  reducedMotion: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onPlayPause}
        className="exp-btn exp-btn-solid !gap-2"
        aria-label={running ? "Pause simulation" : "Play simulation"}
      >
        {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        {running ? "Pause" : "Play"}
      </button>
      <button
        type="button"
        onClick={onStep}
        className="exp-btn exp-btn-ghost !gap-2"
        aria-label="Single step"
      >
        <SkipForward className="h-4 w-4" />
        Step
      </button>
      <button
        type="button"
        onClick={onReplay}
        className="exp-btn exp-btn-ghost !gap-2"
        aria-label="Replay from start"
      >
        <RotateCcw className="h-4 w-4" />
        Reset
      </button>
      {logicalTimeSec !== undefined ? (
        <p
          className="font-mono text-[0.7rem] tabular-nums text-[color:var(--exp-faint)]"
          title="Logical simulation time"
        >
          t = {logicalTimeSec.toFixed(2)}s{seed !== undefined ? ` · seed ${seed}` : ""}
        </p>
      ) : null}
      <Segmented
        className="ml-auto"
        size="sm"
        label="Simulation speed"
        layoutId="sim-speed"
        value={String(speed)}
        onChange={(id) => onSpeed(Number(id))}
        options={[0.5, 1, 2, 4].map((s) => ({
          id: String(s),
          label: `${s}×`,
          title: `Simulation speed ${s}×`,
        }))}
      />
      {reducedMotion ? (
        <p className="w-full font-mono text-[0.65rem] text-[color:var(--exp-faint)]">
          Reduced motion. Step mode friendly; essential state stays readable.
        </p>
      ) : null}
    </div>
  );
}

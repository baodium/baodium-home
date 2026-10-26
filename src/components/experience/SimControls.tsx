"use client";

import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";

export function SimControls({
  running,
  speed,
  onPlayPause,
  onStep,
  onReplay,
  onSpeed,
  reducedMotion,
}: {
  running: boolean;
  speed: number;
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
        className="inline-flex min-h-10 items-center gap-2 rounded-full bg-cream/10 px-3.5 text-sm text-cream transition-colors hover:bg-cream/15"
        aria-label={running ? "Pause simulation" : "Play simulation"}
      >
        {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        {running ? "Pause" : "Play"}
      </button>
      <button
        type="button"
        onClick={onStep}
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-cream/15 px-3.5 text-sm text-cream/80 transition-colors hover:border-cream/35"
        aria-label="Single step"
      >
        <SkipForward className="h-4 w-4" />
        Step
      </button>
      <button
        type="button"
        onClick={onReplay}
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-cream/15 px-3.5 text-sm text-cream/80 transition-colors hover:border-cream/35"
        aria-label="Replay from start"
      >
        <RotateCcw className="h-4 w-4" />
        Replay
      </button>
      <div className="ml-auto flex items-center gap-1 rounded-full border border-cream/15 p-1">
        {[0.5, 1, 2, 4].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSpeed(s)}
            className={`min-h-8 rounded-full px-2.5 font-mono text-[0.7rem] ${
              speed === s ? "bg-cream/15 text-cream" : "text-cream/50 hover:text-cream/80"
            }`}
          >
            {s}×
          </button>
        ))}
      </div>
      {reducedMotion ? (
        <p className="w-full font-mono text-[0.65rem] text-cream/40">
          Reduced motion — step mode friendly; essential state stays readable.
        </p>
      ) : null}
    </div>
  );
}

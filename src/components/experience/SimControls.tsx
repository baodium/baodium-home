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
        Replay
      </button>
      <div className="ml-auto flex items-center gap-1 rounded-full border border-[color:var(--exp-line)] bg-[color:var(--exp-panel)] p-1">
        {[0.5, 1, 2, 4].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSpeed(s)}
            className={`min-h-8 rounded-full px-2.5 font-mono text-[0.7rem] transition-colors ${
              speed === s
                ? "bg-[color:var(--exp-fg)] text-white"
                : "text-[color:var(--exp-muted)] hover:text-[color:var(--exp-fg)]"
            }`}
          >
            {s}×
          </button>
        ))}
      </div>
      {reducedMotion ? (
        <p className="w-full font-mono text-[0.65rem] text-[color:var(--exp-faint)]">
          Reduced motion — step mode friendly; essential state stays readable.
        </p>
      ) : null}
    </div>
  );
}

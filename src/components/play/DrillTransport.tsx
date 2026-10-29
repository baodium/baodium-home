"use client";

/**
 * Shared start / pause / resume / step / reset controls for Play drills.
 * Step mode is the reduced-motion-friendly path; pause freezes the live clock.
 */
export function DrillTransport({
  phase,
  stepMode,
  paused,
  onStart,
  onPause,
  onResume,
  onStep,
  onReset,
  playAgainLabel = "Play again",
}: {
  phase: "intro" | "running" | "won" | "lost";
  stepMode: boolean;
  paused: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStep: () => void;
  onReset: () => void;
  playAgainLabel?: string;
}) {
  const live = phase === "running";

  if (!live) {
    return (
      <button type="button" className="slo-btn-primary" onClick={onStart}>
        {phase === "intro" ? "Start drill" : playAgainLabel}
      </button>
    );
  }

  if (stepMode) {
    return (
      <>
        <button
          type="button"
          className="slo-btn-primary"
          onClick={onStep}
          aria-label="Advance one simulation step"
        >
          Step →
        </button>
        <button
          type="button"
          className="slo-btn-secondary"
          onClick={onReset}
          aria-label="Reset drill"
        >
          Reset
        </button>
      </>
    );
  }

  return (
    <>
      {paused ? (
        <button
          type="button"
          className="slo-btn-primary"
          onClick={onResume}
          aria-label="Resume drill"
        >
          Resume
        </button>
      ) : (
        <button
          type="button"
          className="slo-btn-secondary"
          onClick={onPause}
          aria-label="Pause drill"
        >
          Pause
        </button>
      )}
      <button
        type="button"
        className="slo-btn-secondary"
        onClick={onReset}
        aria-label="Reset drill"
      >
        Reset
      </button>
    </>
  );
}

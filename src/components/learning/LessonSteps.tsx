"use client";

import { useRef, useState } from "react";

export type LessonBeat = { title: string; body: string };

export function LessonSteps({
  label = "Lesson",
  beats,
  density = "default",
  collapsible = false,
}: {
  label?: string;
  beats: LessonBeat[];
  /** Compact sits under a lesson H1 without competing with the workbench. */
  density?: "default" | "compact";
  /** When true with compact, start collapsed to a one-line concept strip. */
  collapsible?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(!collapsible);
  const startX = useRef<number | null>(null);
  const beat = beats[Math.min(index, beats.length - 1)] ?? beats[0];
  if (!beat) return null;

  const go = (next: number) => {
    setIndex(Math.max(0, Math.min(beats.length - 1, next)));
  };

  const compact = density === "compact";
  const collapsed = collapsible && compact && !open;

  return (
    <section
      className={`lesson-steps${compact ? " lesson-steps-compact" : ""}${
        collapsed ? " lesson-steps-collapsed" : ""
      }`}
      aria-label={label}
    >
      {collapsible && compact ? (
        <button
          type="button"
          className="lesson-steps-toggle"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span>
            Concepts · {index + 1} of {beats.length}
            {collapsed ? ` · ${beat.title}` : ""}
          </span>
          <span aria-hidden="true">{open ? "Hide" : "Show"}</span>
        </button>
      ) : null}
      {collapsed ? null : (
        <>
          <div
            className="lesson-step"
            key={`${beat.title}-${index}`}
            onPointerDown={(event) => {
              if (event.pointerType === "mouse" && event.button !== 0) return;
              startX.current = event.clientX;
            }}
            onPointerUp={(event) => {
              if (startX.current == null) return;
              const delta = event.clientX - startX.current;
              startX.current = null;
              if (delta <= -56) go(index + 1);
              if (delta >= 56) go(index - 1);
            }}
            onPointerCancel={() => {
              startX.current = null;
            }}
          >
            {collapsible && compact ? null : (
              <p className="lesson-step-count">
                {index + 1} of {beats.length}
                {compact ? " · concept" : ""}
              </p>
            )}
            <h2>{beat.title}</h2>
            {beat.body ? <p aria-live="polite">{beat.body}</p> : null}
          </div>
          <div className="lesson-step-nav">
            <div className="lesson-step-dots" role="tablist" aria-label={label}>
              {beats.map((item, itemIndex) => (
                <button
                  key={`${item.title}-${itemIndex}`}
                  type="button"
                  role="tab"
                  aria-selected={itemIndex === index}
                  aria-label={`${item.title}, step ${itemIndex + 1}`}
                  onClick={() => go(itemIndex)}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => go(index - 1)}
              disabled={index === 0}
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              disabled={index === beats.length - 1}
            >
              Next
            </button>
          </div>
        </>
      )}
    </section>
  );
}

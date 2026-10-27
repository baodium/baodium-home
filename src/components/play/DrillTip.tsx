"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

/**
 * Inline glossary tip for play-drill controls and meters.
 * Hover / focus / click reveals a short definition (portaled so overflow parents don’t clip).
 */
export function DrillTip({
  label,
  tip,
  children,
}: {
  label?: string;
  tip: string;
  children?: ReactNode;
}) {
  const id = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const width = Math.min(296, window.innerWidth - 24);
    let left = rect.left;
    if (left + width > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - width - 12);
    }
    const above = rect.top >= 96;
    setCoords({
      top: above ? rect.top - 8 : rect.bottom + 8,
      left,
    });
  }, [open]);

  return (
    <span className="drill-tip relative inline-flex max-w-full items-center gap-1.5">
      {children ?? <span>{label}</span>}
      <button
        ref={btnRef}
        type="button"
        className="drill-tip-btn inline-flex size-[1.05rem] shrink-0 items-center justify-center rounded-full border border-white/25 font-mono text-[0.58rem] leading-none text-cream/70 transition-colors hover:border-amber/55 hover:text-amber focus-visible:border-amber focus-visible:text-amber focus-visible:outline-none"
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        aria-label={label ? `About ${label}` : "What this means"}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        ?
      </button>
      {mounted && open && coords
        ? createPortal(
            <span
              id={id}
              role="tooltip"
              className="pointer-events-none fixed z-[80] w-[min(18.5rem,calc(100vw-1.5rem))] rounded-xl border border-amber/30 bg-night px-3 py-2.5 text-left text-[0.78rem] leading-snug text-cream/85 shadow-[0_18px_40px_-22px_rgba(0,0,0,0.85)]"
              style={{
                top: coords.top,
                left: coords.left,
                transform:
                  coords.top < (btnRef.current?.getBoundingClientRect().top ?? 0)
                    ? "translateY(-100%)"
                    : undefined,
              }}
            >
              {tip}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}

/** Label row with optional tip — for sliders and checkbox rows. */
export function DrillControlLabel({
  label,
  tip,
  value,
}: {
  label: string;
  tip?: string;
  value?: ReactNode;
}) {
  return (
    <span className="flex justify-between gap-3 text-[0.78rem] text-cream/45">
      {tip ? (
        <DrillTip label={label} tip={tip}>
          <span className="text-cream/55">{label}</span>
        </DrillTip>
      ) : (
        <span>{label}</span>
      )}
      {value != null ? (
        <span className="tabular-nums text-cream">{value}</span>
      ) : null}
    </span>
  );
}

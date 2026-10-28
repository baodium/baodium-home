"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

function subscribeNowhere() {
  return () => {};
}

type Coords = {
  top: number;
  left: number;
  place: "above" | "below";
  width: number;
};

/**
 * Glossary tip: dotted term is the hit target (optional quiet mark for icon-only).
 * Portaled; recomputes on scroll/resize; flips above/below and clamps horizontally.
 */
export function DrillTip({
  label,
  tip,
  children,
  mark = "auto",
}: {
  label?: string;
  tip: string;
  children?: ReactNode;
  /** "auto" = show ? only when there is no text child; "never" / "always" override. */
  mark?: "auto" | "never" | "always";
}) {
  const id = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const mounted = useSyncExternalStore(subscribeNowhere, () => true, () => false);
  const hasChild = children != null;
  const showMark =
    mark === "always" || (mark === "auto" && !hasChild);

  const updateCoords = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const width = Math.min(256, window.innerWidth - 24);
    let left = rect.left + rect.width / 2 - width / 2;
    if (left < 12) left = 12;
    if (left + width > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - width - 12);
    }
    const tipH = tipRef.current?.offsetHeight ?? 72;
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const place: "above" | "below" =
      spaceAbove >= tipH + 12 || spaceAbove > spaceBelow ? "above" : "below";
    setCoords({
      top: place === "above" ? rect.top - 8 : rect.bottom + 8,
      left,
      place,
      width,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateCoords();
    const onScroll = () => updateCoords();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (btnRef.current?.contains(t)) return;
      if (tipRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    window.addEventListener("keydown", onKey);
    const timer = window.setTimeout(() => {
      window.addEventListener("pointerdown", onPointer);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open, updateCoords]);

  return (
    <span className="drill-tip relative inline-flex max-w-full items-center gap-1">
      <button
        ref={btnRef}
        type="button"
        className={`inline-flex max-w-full items-center gap-1 rounded-sm text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--drill-signal)]/40 ${
          hasChild
            ? "border-b border-dotted border-[color:var(--drill-line-strong)] pb-px text-[inherit] hover:border-[color:var(--drill-signal)]"
            : ""
        }`}
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
        {children ?? <span>{label}</span>}
        {showMark ? (
          <span
            aria-hidden="true"
            className="drill-tip-btn inline-flex size-[1.05rem] shrink-0 items-center justify-center rounded-full border border-[color:var(--drill-line-strong)] font-mono text-[0.58rem] leading-none text-[color:var(--drill-muted)]"
          >
            ?
          </span>
        ) : null}
      </button>
      {mounted && open && coords
        ? createPortal(
            <span
              ref={tipRef}
              id={id}
              role="tooltip"
              className="fixed z-[80] rounded-xl border border-[color-mix(in_srgb,var(--drill-signal)_35%,transparent)] bg-[color:var(--drill-panel)] px-3 py-2.5 text-left text-[0.78rem] leading-snug text-[color:var(--drill-fg)] shadow-[0_18px_40px_-22px_rgba(26,35,48,0.45)]"
              style={{
                top: coords.top,
                left: coords.left,
                width: coords.width,
                transform: coords.place === "above" ? "translateY(-100%)" : undefined,
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

/**
 * Control label with optional tip + full-sentence help under the slider.
 * Prefer `help` for teaching prose; keep `tip` for the glossary hover.
 */
export function DrillControlLabel({
  label,
  tip,
  help,
  value,
}: {
  label: string;
  tip?: string;
  /** Full-sentence explanation shown under the control. */
  help?: ReactNode;
  value?: ReactNode;
}) {
  return (
    <span className="block">
      <span className="flex justify-between gap-3 text-[0.82rem] text-[color:var(--drill-muted)]">
        {tip ? (
          <DrillTip label={label} tip={tip} mark="never">
            <span className="font-medium text-[color:var(--drill-fg)]">{label}</span>
          </DrillTip>
        ) : (
          <span className="font-medium text-[color:var(--drill-fg)]">{label}</span>
        )}
        {value != null ? (
          <span className="tabular-nums text-[color:var(--drill-fg)]">{value}</span>
        ) : null}
      </span>
      {help ? (
        <span className="mt-1.5 block text-[0.84rem] leading-relaxed text-[color:var(--drill-muted)]">
          {help}
        </span>
      ) : null}
    </span>
  );
}

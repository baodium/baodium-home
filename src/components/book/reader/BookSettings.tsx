"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useReader } from "@/components/book/reader/ReaderProvider";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";
import type { ReaderFontScale, ReaderTheme } from "@/lib/book/reader-styles";

function subscribeNowhere() {
  return () => {};
}

const themes: { id: ReaderTheme; label: string; swatch: string }[] = [
  { id: "light", label: "Light", swatch: "#ffffff" },
  { id: "paper", label: "Paper", swatch: "#f3e8d4" },
  { id: "dark", label: "Dark", swatch: "#0a0908" },
];

const scales: { id: ReaderFontScale; label: string }[] = [
  { id: "sm", label: "A−" },
  { id: "md", label: "A" },
  { id: "lg", label: "A+" },
];

const measures: { id: "narrow" | "comfortable" | "wide"; label: string }[] = [
  { id: "narrow", label: "Narrow" },
  { id: "comfortable", label: "Comfort" },
  { id: "wide", label: "Wide" },
];

const ease = [0.22, 1, 0.36, 1] as const;

export function BookSettings({
  anchorRef,
}: {
  anchorRef: RefObject<HTMLElement | null>;
}) {
  const { prefs, setPrefs, settingsOpen, setSettingsOpen } = useReader();
  const reduceMotion = usePrefersReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(subscribeNowhere, () => true, () => false);
  const [pos, setPos] = useState({ top: 64, right: 16 });

  useLayoutEffect(() => {
    if (!settingsOpen) return;
    const update = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPos({
        top: rect.bottom + 10,
        right: Math.max(12, window.innerWidth - rect.right),
      });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [settingsOpen, anchorRef]);

  useEffect(() => {
    if (!settingsOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSettingsOpen(false);
    };

    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      setSettingsOpen(false);
    };

    const timer = window.setTimeout(() => {
      window.addEventListener("pointerdown", onPointer);
    }, 0);
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [settingsOpen, setSettingsOpen, anchorRef]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {settingsOpen ? (
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-label="Reading settings"
          aria-modal="false"
          initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: reduceMotion ? 0.01 : 0.28, ease }}
          className="book-settings-panel fixed z-[80] w-[min(100vw-1.5rem,18.5rem)] overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--reader-fg)_12%,transparent)] bg-[var(--reader-page)] p-3 text-[var(--reader-fg)] shadow-[0_24px_50px_-28px_rgba(40,24,12,0.55)]"
          style={{ top: pos.top, right: pos.right }}
        >
          <p className="px-1 pb-2 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[var(--reader-muted)]">
            Reading
          </p>

          <div className="space-y-3">
            <fieldset>
              <legend className="mb-1.5 px-1 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--reader-muted)]">
                Theme
              </legend>
              <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Color theme">
                {themes.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setPrefs({ theme: t.id })}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-[0.72rem] transition-colors ${
                      prefs.theme === t.id
                        ? "border-cinnabar/50 bg-[color-mix(in_srgb,var(--cinnabar)_10%,transparent)]"
                        : "border-[color-mix(in_srgb,var(--reader-fg)_12%,transparent)] hover:border-[color-mix(in_srgb,var(--reader-fg)_28%,transparent)]"
                    }`}
                    aria-pressed={prefs.theme === t.id}
                  >
                    <span
                      aria-hidden="true"
                      className="h-5 w-5 rounded-full border border-ink/15 shadow-inner"
                      style={{ background: t.swatch }}
                    />
                    {t.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-1.5 px-1 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--reader-muted)]">
                Size
              </legend>
              <div className="flex gap-1" role="group" aria-label="Font size">
                {scales.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setPrefs({ fontScale: s.id })}
                    className={`min-h-10 flex-1 rounded-full text-sm transition-colors ${
                      prefs.fontScale === s.id
                        ? "bg-ink text-[var(--reader-page)]"
                        : "border border-[color-mix(in_srgb,var(--reader-fg)_14%,transparent)] hover:border-[color-mix(in_srgb,var(--reader-fg)_30%,transparent)]"
                    }`}
                    aria-pressed={prefs.fontScale === s.id}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-1.5 px-1 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--reader-muted)]">
                Measure
              </legend>
              <div className="flex gap-1" role="group" aria-label="Line length">
                {measures.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPrefs({ measure: m.id })}
                    className={`min-h-10 flex-1 rounded-full px-2 text-[0.72rem] transition-colors ${
                      prefs.measure === m.id
                        ? "bg-ink text-[var(--reader-page)]"
                        : "border border-[color-mix(in_srgb,var(--reader-fg)_14%,transparent)] hover:border-[color-mix(in_srgb,var(--reader-fg)_30%,transparent)]"
                    }`}
                    aria-pressed={prefs.measure === m.id}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

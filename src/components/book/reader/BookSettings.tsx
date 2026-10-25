"use client";

import { useReader } from "@/components/book/reader/ReaderProvider";
import type { ReaderFontScale, ReaderTheme } from "@/lib/book/reader-styles";

const themes: { id: ReaderTheme; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "paper", label: "Paper" },
];

const scales: { id: ReaderFontScale; label: string }[] = [
  { id: "sm", label: "A−" },
  { id: "md", label: "A" },
  { id: "lg", label: "A+" },
];

export function BookSettings() {
  const { prefs, setPrefs } = useReader();

  return (
    <div
      className="flex flex-wrap items-center gap-2 border-t border-ink/10 px-4 py-3 text-xs text-[var(--reader-muted)] md:px-0"
      aria-label="Reading settings"
    >
      <span className="font-mono uppercase tracking-[0.16em]">Theme</span>
      <div className="flex gap-1" role="group" aria-label="Color theme">
        {themes.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setPrefs({ theme: t.id })}
            className={`rounded-full px-3 py-1.5 transition-colors ${
              prefs.theme === t.id
                ? "bg-ink text-[var(--reader-bg)]"
                : "border border-ink/15 hover:border-ink/30"
            }`}
            aria-pressed={prefs.theme === t.id}
          >
            {t.label}
          </button>
        ))}
      </div>
      <span className="mx-1 hidden h-4 w-px bg-ink/15 sm:inline" aria-hidden="true" />
      <span className="font-mono uppercase tracking-[0.16em]">Size</span>
      <div className="flex gap-1" role="group" aria-label="Font size">
        {scales.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setPrefs({ fontScale: s.id })}
            className={`rounded-full px-3 py-1.5 transition-colors ${
              prefs.fontScale === s.id
                ? "bg-ink text-[var(--reader-bg)]"
                : "border border-ink/15 hover:border-ink/30"
            }`}
            aria-pressed={prefs.fontScale === s.id}
          >
            {s.label}
          </button>
        ))}
      </div>
      <span className="mx-1 hidden h-4 w-px bg-ink/15 sm:inline" aria-hidden="true" />
      <span className="font-mono uppercase tracking-[0.16em]">Measure</span>
      <select
        value={prefs.measure}
        onChange={(e) =>
          setPrefs({ measure: e.target.value as "narrow" | "comfortable" | "wide" })
        }
        className="rounded-full border border-ink/15 bg-transparent px-3 py-1.5"
        aria-label="Line length"
      >
        <option value="narrow">Narrow</option>
        <option value="comfortable">Comfortable</option>
        <option value="wide">Wide</option>
      </select>
    </div>
  );
}

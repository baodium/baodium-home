"use client";

import { useEffect, useState } from "react";
import { useReader } from "@/components/book/reader/ReaderProvider";
import { loadReaderPrefs, saveReaderPrefs } from "@/lib/book/reader-styles";
import { chapterNumberLabel } from "@/lib/book/chapter-label";

/** Reading progress under the chrome — chapter position + scroll fill. */
export function BookProgress({
  slug,
  index,
  total,
}: {
  slug: string;
  index?: number;
  total?: number;
}) {
  const { chromeVisible } = useReader();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = document.getElementById("book-reader-scroll");
    if (!el) return;

    const update = () => {
      const max = el.scrollHeight - el.clientHeight;
      const next = max <= 0 ? 0 : Math.min(1, Math.max(0, el.scrollTop / max));
      setProgress(next);
      const prefs = loadReaderPrefs();
      saveReaderPrefs({
        ...prefs,
        progressBySlug: { ...prefs.progressBySlug, [slug]: next },
      });
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [slug]);

  const pct = Math.round(progress * 100);
  const label =
    typeof index === "number" && typeof total === "number" && total > 0
      ? `${chapterNumberLabel(slug)} · ${pct}%`
      : `${pct}%`;

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-0 z-[1] transition-opacity duration-300 ${
        chromeVisible ? "opacity-100" : "opacity-70"
      }`}
    >
      <div
        className={`mx-auto mb-0.5 flex w-full max-w-[calc(var(--reader-measure)+3.5rem)] justify-end px-3 transition-[opacity,transform] duration-300 ${
          chromeVisible && pct > 0
            ? "translate-y-0 opacity-100"
            : "translate-y-1 opacity-0"
        }`}
      >
        <span className="rounded-full bg-[color-mix(in_srgb,var(--reader-page)_88%,transparent)] px-2 py-0.5 font-mono text-[0.58rem] tracking-[0.12em] text-[var(--reader-muted)] shadow-[0_4px_12px_-8px_rgba(18,17,16,0.35)] backdrop-blur-sm">
          {label}
        </span>
      </div>
      <div
        className="h-[2.5px] w-full"
        role="progressbar"
        aria-label="Chapter reading progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div
          className="book-progress-fill h-full origin-left bg-gradient-to-r from-cinnabar via-amber to-cinnabar transition-[width] duration-150 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}

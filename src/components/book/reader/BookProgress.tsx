"use client";

import { useEffect, useState } from "react";
import { useReader } from "@/components/book/reader/ReaderProvider";
import { loadReaderPrefs, saveReaderPrefs } from "@/lib/book/reader-styles";

/** Thin reading progress anchored under the reading chrome. */
export function BookProgress({ slug }: { slug: string }) {
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

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[2px] transition-opacity duration-300 ${
        chromeVisible ? "opacity-100" : "opacity-55"
      }`}
      role="progressbar"
      aria-label="Chapter reading progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
    >
      <div
        className="h-full origin-left bg-gradient-to-r from-cinnabar via-amber to-cinnabar transition-[width] duration-150 ease-out"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}

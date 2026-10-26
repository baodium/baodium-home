"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark } from "lucide-react";
import { loadReaderPrefs } from "@/lib/book/reader-styles";
import type { BookChapterMeta } from "@/lib/book/types";

function subscribeNowhere() {
  return () => {};
}

export function BookResume({ chapters }: { chapters: BookChapterMeta[] }) {
  const pathname = usePathname();
  const snapshot = useSyncExternalStore(
    subscribeNowhere,
    () => {
      const prefs = loadReaderPrefs();
      return JSON.stringify({
        slug: prefs.lastSlug ?? null,
        pct: prefs.lastSlug
          ? Math.round((prefs.progressBySlug?.[prefs.lastSlug] ?? 0) * 100)
          : 0,
      });
    },
    () => JSON.stringify({ slug: null, pct: 0 }),
  );

  const { slug, pct } = JSON.parse(snapshot) as { slug: string | null; pct: number };
  if (!slug || pathname === `/system-design/${slug}`) return null;
  const chapter = chapters.find((c) => c.slug === slug);
  if (!chapter) return null;

  return (
    <div className="mb-4 rounded-2xl border border-[color-mix(in_srgb,var(--cinnabar)_25%,transparent)] bg-[color-mix(in_srgb,var(--cinnabar)_8%,var(--reader-page))] px-4 py-3">
      <p className="flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-cinnabar">
        <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
        Resume on this device
      </p>
      <Link
        href={`/system-design/${slug}`}
        className="mt-1.5 inline-flex flex-wrap items-baseline gap-x-2 font-serif text-lg leading-snug text-[var(--reader-fg)] underline-offset-4 hover:underline"
      >
        <span>{chapter.title}</span>
        {pct > 0 ? (
          <span className="font-sans text-sm text-[var(--reader-muted)]">{pct}% in</span>
        ) : null}
      </Link>
    </div>
  );
}

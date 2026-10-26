"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";

export function BookShareBar({
  chapterTitle,
  chapterSlug,
}: {
  chapterTitle: string;
  chapterSlug: string;
}) {
  const [copied, setCopied] = useState(false);

  const copyChapterLink = async () => {
    const url = `${window.location.origin}/system-design/${chapterSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("Copy chapter link", url);
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/system-design/${chapterSlug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: chapterTitle, url });
        return;
      } catch {
        /* fall through to copy */
      }
    }
    await copyChapterLink();
  };

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={copyChapterLink}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--reader-fg)_14%,transparent)] px-3 text-xs text-[var(--reader-muted)] transition-colors hover:text-[var(--reader-fg)]"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-cinnabar" aria-hidden="true" />
        ) : (
          <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {copied ? "Copied chapter link" : "Copy chapter link"}
      </button>
      <button
        type="button"
        onClick={share}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--reader-fg)_14%,transparent)] px-3 text-xs text-[var(--reader-muted)] transition-colors hover:text-[var(--reader-fg)]"
      >
        Share
      </button>
    </div>
  );
}

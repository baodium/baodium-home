"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getChapter } from "@/lib/learning/registry";

function chapterFromPath(pathname: string) {
  const slug = pathname.match(/chapter-\d+/)?.[0];
  return slug ? getChapter(slug) : undefined;
}

/** Header title and chapter link for whichever lab is open. */
export function LabPathChrome({ title, prose = false }: { title?: string; prose?: boolean }) {
  const pathname = usePathname() ?? "";
  const chapter = chapterFromPath(pathname);

  if (prose) {
    if (!chapter) return null;
    return (
      <Link href={chapter.bookHref} className="exp-btn exp-btn-ghost !min-h-9 !px-3 text-sm">
        Chapter prose
      </Link>
    );
  }

  const label = chapter ? `Chapter ${chapter.number} · ${chapter.shortTitle}` : title;
  if (!label) return null;
  return (
    <>
      <span className="hidden text-[color:var(--exp-faint)] md:inline" aria-hidden="true">
        /
      </span>
      <p className="hidden min-w-0 truncate font-serif text-sm italic text-[color:var(--exp-muted)] md:block">
        {label}
      </p>
    </>
  );
}

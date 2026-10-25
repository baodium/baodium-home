"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import type { BookChapterMeta } from "@/lib/book/types";
import { useReader } from "@/components/book/reader/ReaderProvider";

export function BookSidebar({ chapters }: { chapters: BookChapterMeta[] }) {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useReader();

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm transition-opacity lg:hidden ${
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!sidebarOpen}
        onClick={() => setSidebarOpen(false)}
      />
      <aside
        className={`book-sidebar fixed inset-y-0 left-0 z-50 flex w-[min(100%,18.5rem)] flex-col border-r border-ink/10 bg-[var(--reader-bg)] text-[var(--reader-fg)] transition-transform duration-300 lg:static lg:z-0 lg:w-72 lg:translate-x-0 lg:shrink-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Table of contents"
      >
        <div className="flex items-center justify-between gap-2 border-b border-ink/10 px-4 py-3">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[var(--reader-muted)]">
            Contents
          </p>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ink/10 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close contents"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <ol className="space-y-0.5 text-sm">
            <li>
              <Link
                href="/system-design"
                className={`block rounded-lg px-3 py-2 transition-colors hover:bg-ink/[0.05] ${
                  pathname === "/system-design" ? "bg-ink/[0.07] font-medium" : ""
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                Overview
              </Link>
            </li>
            {chapters.map((chapter) => {
              const href = `/system-design/${chapter.slug}`;
              const active = pathname === href;
              return (
                <li key={chapter.slug}>
                  <Link
                    href={href}
                    className={`block rounded-lg px-3 py-2 leading-snug transition-colors hover:bg-ink/[0.05] ${
                      active ? "bg-ink/[0.07] font-medium" : "text-[var(--reader-muted)]"
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    {chapter.title}
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>
      </aside>
    </>
  );
}

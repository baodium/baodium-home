"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Check } from "lucide-react";

export function ChapterContent({ html }: { html: string }) {
  const rootRef = useRef<HTMLElement>(null);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const cleanups: Array<() => void> = [];

    const bindCopy = (btn: HTMLButtonElement, getText: () => string) => {
      if (btn.dataset.bound === "1") return;
      btn.dataset.bound = "1";
      const onClick = async () => {
        await navigator.clipboard.writeText(getText());
        btn.classList.add("copied");
        const label = btn.querySelector(".code-copy-label");
        if (label) label.textContent = "Copied";
        window.setTimeout(() => {
          btn.classList.remove("copied");
          if (label) label.textContent = "Copy";
        }, 1500);
      };
      btn.addEventListener("click", onClick);
      cleanups.push(() => btn.removeEventListener("click", onClick));
    };

    root.querySelectorAll<HTMLButtonElement>("button.code-copy").forEach((btn) => {
      bindCopy(btn, () => {
        const frame = btn.closest(".book-listing-frame") ?? btn.closest("pre");
        return (
          frame?.querySelector("pre code")?.textContent ??
          frame?.querySelector("code")?.textContent ??
          ""
        );
      });
    });

    // Legacy bare <pre> without listing chrome.
    root.querySelectorAll("pre:not(.shiki)").forEach((pre) => {
      if (pre.closest(".book-listing") || pre.querySelector(".code-copy")) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "code-copy";
      btn.setAttribute("aria-label", "Copy code");
      btn.innerHTML = `<span class="code-copy-label">Copy</span>`;
      pre.classList.add("has-copy");
      pre.appendChild(btn);
      bindCopy(btn, () => pre.querySelector("code")?.textContent ?? pre.textContent ?? "");
    });

    root.querySelectorAll<HTMLHeadingElement>("h2[id], h3[id]").forEach((heading) => {
      if (heading.dataset.linkBound === "1") return;
      heading.dataset.linkBound = "1";
      heading.classList.add("book-heading-anchor");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "book-section-link";
      btn.setAttribute("aria-label", `Copy link to ${heading.textContent ?? "section"}`);
      btn.textContent = "#";
      const onClick = async (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        const url = `${window.location.origin}${window.location.pathname}#${heading.id}`;
        try {
          await navigator.clipboard.writeText(url);
          btn.textContent = "✓";
          btn.classList.add("copied");
          window.setTimeout(() => {
            btn.textContent = "#";
            btn.classList.remove("copied");
          }, 1400);
        } catch {
          window.prompt("Copy section link", url);
        }
      };
      btn.addEventListener("click", onClick);
      heading.appendChild(btn);
      cleanups.push(() => {
        btn.removeEventListener("click", onClick);
        btn.remove();
      });
    });

    const onImg = (event: Event) => {
      const img = event.currentTarget as HTMLImageElement;
      setZoomSrc(img.src);
    };
    root.querySelectorAll<HTMLImageElement>("img[data-zoomable], img").forEach((img) => {
      img.style.cursor = "zoom-in";
      img.addEventListener("click", onImg);
      cleanups.push(() => img.removeEventListener("click", onImg));
    });

    return () => cleanups.forEach((fn) => fn());
  }, [html]);

  useEffect(() => {
    if (!zoomSrc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomSrc(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomSrc]);

  return (
    <>
      <article
        ref={rootRef}
        className="book-prose"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {zoomSrc ? (
        <button
          type="button"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/80 p-6"
          onClick={() => setZoomSrc(null)}
          aria-label="Close enlarged figure"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoomSrc} alt="" className="max-h-[90vh] max-w-full rounded-lg bg-white object-contain" />
        </button>
      ) : null}
    </>
  );
}

export function CopyIconFallback() {
  return (
    <>
      <Copy className="h-3.5 w-3.5 copy-icon" aria-hidden="true" />
      <Check className="h-3.5 w-3.5 check-icon hidden" aria-hidden="true" />
    </>
  );
}

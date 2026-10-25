"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Check } from "lucide-react";

export function ChapterContent({ html }: { html: string }) {
  const rootRef = useRef<article>(null);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const pres = root.querySelectorAll("pre");
    pres.forEach((pre) => {
      if (pre.querySelector(".code-copy")) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "code-copy";
      btn.setAttribute("aria-label", "Copy code");
      btn.innerHTML = `<span class="sr-only">Copy</span>`;
      btn.addEventListener("click", async () => {
        const code = pre.querySelector("code")?.textContent ?? pre.textContent ?? "";
        await navigator.clipboard.writeText(code);
        btn.classList.add("copied");
        setTimeout(() => btn.classList.remove("copied"), 1500);
      });
      pre.classList.add("has-copy");
      pre.appendChild(btn);
    });

    const imgs = root.querySelectorAll<HTMLImageElement>("img[data-zoomable], img");
    imgs.forEach((img) => {
      img.style.cursor = "zoom-in";
      img.addEventListener("click", () => setZoomSrc(img.src));
    });
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

"use client";

import Image from "next/image";
import { useRef, type PointerEvent } from "react";
import type { Project } from "@/data/projects";

function allowTilt(event: { pointerType: string }) {
  if (event.pointerType !== "mouse") return false;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function ProjectCard({ project }: { project: Project }) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const glazeRef = useRef<HTMLDivElement>(null);

  const move = (event: PointerEvent<HTMLAnchorElement>) => {
    const card = cardRef.current;
    if (!card || !allowTilt(event)) return;
    const rect = card.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    card.classList.add("is-tracking");
    card.style.transform = `perspective(1100px) rotateY(${px * 5}deg) rotateX(${py * -4.5}deg) scale(1.012)`;
    if (previewRef.current) {
      previewRef.current.style.transform = `translate3d(${px * -16}px, ${py * -12}px, 0) scale(1.14)`;
    }
    if (glazeRef.current) {
      glazeRef.current.style.transform = `translate3d(${px * 12}px, ${py * 9}px, 0)`;
    }
  };

  const reset = () => {
    const card = cardRef.current;
    if (!card) return;
    card.classList.remove("is-tracking");
    card.style.transform = "perspective(1100px) rotateY(0deg) rotateX(0deg) scale(1)";
    if (previewRef.current) previewRef.current.style.transform = "scale(1.12)";
    if (glazeRef.current) glazeRef.current.style.transform = "translate3d(0, 0, 0)";
  };

  return (
    <a
      ref={cardRef}
      href={project.url}
      target="_blank"
      rel="noopener noreferrer"
      onPointerMove={move}
      onPointerLeave={reset}
      onPointerCancel={reset}
      className="project-card group flex h-full flex-col border border-line bg-raise lg:min-h-[28rem] lg:flex-row"
    >
      <div className="flex flex-1 flex-col justify-between p-7 md:p-9">
        <div>
          <p className="text-[0.72rem] uppercase tracking-[0.2em] text-faint">A Baodium project</p>
          <h3 className="mt-6 font-serif text-4xl leading-none tracking-[-0.03em] md:text-5xl">
            {project.name}
          </h3>
          <p className="mt-5 max-w-sm text-[0.98rem] leading-relaxed text-muted">
            {project.description}
          </p>
        </div>
        <div className="mt-10 flex items-end justify-between gap-6">
          <p className="card-meta text-[0.72rem] uppercase tracking-[0.16em] text-bronze">
            {project.tags.join(" / ")} / {project.status}
          </p>
          <span className="inline-flex items-center gap-2 text-sm text-ink">
            Launch
            <span className="card-arrow" aria-hidden="true">
              →
            </span>
          </span>
        </div>
      </div>
      <div className="relative min-h-56 flex-1 overflow-hidden border-t border-line lg:min-h-0 lg:border-t-0 lg:border-l">
        <div ref={previewRef} className="preview-layer absolute -inset-[8%]">
          <Image
            src={project.image}
            alt=""
            fill
            sizes="(min-width: 1024px) 28rem, 100vw"
            className="object-cover"
          />
        </div>
        <div
          ref={glazeRef}
          aria-hidden="true"
          className="glaze pointer-events-none absolute inset-5 border border-white/15"
        />
      </div>
    </a>
  );
}

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/data/projects";

const tones = {
  cinnabar: {
    card: "bg-ember text-cream",
    kicker: "text-cinnabar",
    quiet: "text-cream/75",
    meta: "text-[#e8c56a]",
  },
  moss: {
    card: "bg-cream text-ink",
    kicker: "text-moss",
    quiet: "text-muted",
    meta: "text-moss",
  },
} as const;

export function ProjectCard({
  project,
  featured = false,
}: {
  project: Project;
  featured?: boolean;
}) {
  const tone = tones[project.tone];
  const shot = (
    <div className={featured ? "lg:col-span-7" : "max-lg:order-2 lg:col-span-5"}>
      <div className="relative aspect-[8/5] overflow-hidden bg-ink">
        <Image
          src={project.image}
          alt=""
          fill
          sizes={featured ? "(min-width: 1024px) 46rem, 100vw" : "(min-width: 1024px) 28rem, 100vw"}
          className="preview-shot object-cover object-top"
        />
      </div>
    </div>
  );

  return (
    <a
      href={project.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`project-card group grid overflow-hidden lg:grid-cols-12 ${tone.card}`}
    >
      {featured ? null : shot}
      <div
        className={`flex flex-col justify-between gap-8 p-7 md:p-9 ${featured ? "lg:col-span-5" : "max-lg:order-1 lg:col-span-7"}`}
      >
        <div>
          <p className={`text-[0.72rem] font-medium uppercase tracking-[0.18em] ${tone.kicker}`}>
            {project.tags.join(" / ")}
          </p>
          <h3 className={`mt-3 font-serif leading-[0.95] tracking-[-0.03em] ${featured ? "text-4xl md:text-5xl" : "text-3xl md:text-4xl"}`}>
            {project.name}
          </h3>
          <p className={`mt-4 max-w-md leading-relaxed ${tone.quiet}`}>{project.description}</p>
        </div>
        <p className="flex items-center justify-between gap-4 text-sm">
          <span className={`inline-flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.16em] ${tone.meta}`}>
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
            {project.status}
          </span>
          <span className="inline-flex min-h-11 items-center gap-1">
            Open
            <ArrowUpRight aria-hidden="true" className="card-arrow h-4 w-4" strokeWidth={1.75} />
            <span className="sr-only"> (opens in a new tab)</span>
          </span>
        </p>
      </div>
      {featured ? shot : null}
    </a>
  );
}

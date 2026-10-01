import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/data/projects";

const tones = {
  cinnabar: {
    card: "bg-ember text-cream",
    kicker: "text-cinnabar",
    quiet: "text-cream/75",
    meta: "text-[#e8c56a]",
    frame: "bg-[#140d0b]",
  },
  moss: {
    card: "bg-cream text-ink",
    kicker: "text-moss",
    quiet: "text-muted",
    meta: "text-moss",
    frame: "bg-kiln",
  },
} as const;

function Shot({
  project,
  frame,
  span,
}: {
  project: Project;
  frame: string;
  span: string;
}) {
  return (
    <div className={`relative min-h-72 p-4 md:p-6 ${span} ${frame}`}>
      <div className="relative h-full overflow-hidden border border-white/15 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
        <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-cinnabar" />
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#e8c56a]" />
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-moss" />
        </div>
        <div className="preview-shot relative h-56 sm:h-72 lg:h-[22rem]">
          <Image
            src={project.image}
            alt=""
            fill
            sizes="(min-width: 1024px) 36rem, 100vw"
            className="object-cover object-top"
          />
        </div>
      </div>
    </div>
  );
}

export function ProjectCard({
  project,
  featured = false,
}: {
  project: Project;
  featured?: boolean;
}) {
  const tone = tones[project.tone];
  const shot = (
    <Shot project={project} frame={tone.frame} span={featured ? "lg:col-span-6" : "lg:col-span-5"} />
  );

  return (
    <a
      href={project.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`project-card group grid overflow-hidden border border-white/10 lg:grid-cols-12 ${tone.card}`}
    >
      {featured ? null : shot}
      <div className={`flex flex-col justify-between p-7 md:p-10 ${featured ? "lg:col-span-6" : "lg:col-span-7"}`}>
        <div>
          <p className={`text-[0.72rem] font-medium uppercase tracking-[0.2em] ${tone.kicker}`}>
            {project.tags.join(" / ")}
          </p>
          <h3
            className={`mt-4 font-serif leading-[0.92] tracking-[-0.03em] ${
              featured ? "text-5xl md:text-6xl" : "text-4xl md:text-5xl"
            }`}
          >
            {project.name}
          </h3>
          <p className={`mt-5 max-w-md text-[1.05rem] leading-relaxed ${tone.quiet}`}>
            {project.description}
          </p>
        </div>
        <div className="mt-10 flex items-end justify-between gap-6">
          <p className={`inline-flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.16em] ${tone.meta}`}>
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
            {project.status}
          </p>
          <span className="inline-flex min-h-11 items-center gap-1.5 text-sm">
            Open
            <ArrowUpRight aria-hidden="true" className="card-arrow h-4 w-4" strokeWidth={1.75} />
            <span className="sr-only"> (opens in a new tab)</span>
          </span>
        </div>
      </div>
      {featured ? shot : null}
    </a>
  );
}

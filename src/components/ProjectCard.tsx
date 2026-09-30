import Image from "next/image";
import type { Project } from "@/data/projects";

export function ProjectCard({
  project,
  featured = false,
}: {
  project: Project;
  featured?: boolean;
}) {
  return (
    <a
      href={project.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`project-card group flex h-full flex-col border border-line bg-raise md:flex-row ${
        featured ? "md:min-h-[30rem]" : "md:min-h-[20rem]"
      }`}
    >
      <div
        className={`flex flex-1 flex-col justify-between ${featured ? "p-7 md:p-10" : "p-7 md:p-8"}`}
      >
        <div>
          <p className="text-[0.72rem] uppercase tracking-[0.2em] text-faint">
            A Baodium project
          </p>
          <h3
            className={`mt-5 font-serif leading-none tracking-[-0.03em] ${
              featured ? "text-4xl md:text-6xl" : "text-4xl md:text-5xl"
            }`}
          >
            {project.name}
          </h3>
          <p className="mt-5 max-w-md text-[1.02rem] leading-relaxed text-muted">
            {project.description}
          </p>
        </div>
        <div className="mt-10 flex items-end justify-between gap-6">
          <p className="text-[0.72rem] uppercase tracking-[0.16em] text-bronze">
            {project.tags.join(" / ")} / {project.status}
          </p>
          <span className="inline-flex min-h-11 items-center gap-2 text-sm text-ink">
            Open
            <span className="card-arrow" aria-hidden="true">
              →
            </span>
            <span className="sr-only"> (opens in a new tab)</span>
          </span>
        </div>
      </div>
      <div
        className={`relative min-h-64 overflow-hidden border-t border-line md:min-h-0 md:border-t-0 md:border-l ${
          featured ? "md:w-[46%]" : "md:w-[38%]"
        }`}
      >
        <div className="preview-layer absolute inset-0">
          <Image
            src={project.image}
            alt=""
            fill
            sizes={featured ? "(min-width: 768px) 40rem, 100vw" : "(min-width: 768px) 24rem, 100vw"}
            className="object-cover object-center"
          />
        </div>
      </div>
    </a>
  );
}

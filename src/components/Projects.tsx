import { ProjectCard } from "@/components/ProjectCard";
import { Reveal } from "@/components/Reveal";
import { projects } from "@/data/projects";

export function Projects() {
  return (
    <section id="work" aria-labelledby="work-heading" className="section">
      <Reveal>
        <div className="shell">
          <h2
            id="work-heading"
            className="font-sans text-[0.72rem] font-medium uppercase tracking-[0.22em] text-bronze"
          >
            Selected work
          </h2>
          <div className="mt-12 grid items-stretch gap-4 lg:grid-cols-12">
            {projects.map((project) => (
              <div
                key={project.slug}
                className={project.featured ? "lg:col-span-8" : "lg:col-span-6"}
              >
                <ProjectCard project={project} />
              </div>
            ))}
            <article
              aria-label="Next project, coming soon"
              className="flex min-h-48 flex-col justify-between border border-line p-7 md:p-8 lg:col-span-4"
            >
              <p className="text-[0.72rem] uppercase tracking-[0.22em] text-faint">Coming soon</p>
              <h3 className="font-serif text-3xl tracking-[-0.03em] text-ink">Next project</h3>
            </article>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

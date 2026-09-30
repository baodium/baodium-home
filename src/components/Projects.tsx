import { ProjectCard } from "@/components/ProjectCard";
import { Reveal } from "@/components/Reveal";
import { projects } from "@/data/projects";

export function Projects() {
  const featured = projects.filter((project) => project.featured);
  const rest = projects.filter((project) => !project.featured);

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
          <div className="mt-12 flex flex-col gap-6">
            {featured.map((project) => (
              <ProjectCard key={project.slug} project={project} featured />
            ))}
            {rest.map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

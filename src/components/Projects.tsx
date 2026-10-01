import { ProjectCard } from "@/components/ProjectCard";
import { Reveal } from "@/components/Reveal";
import { projects } from "@/data/projects";

export function Projects() {
  const featured = projects.filter((project) => project.featured);
  const rest = projects.filter((project) => !project.featured);

  return (
    <section id="work" aria-labelledby="work-heading" className="section bg-kiln text-cream">
      <Reveal>
        <div className="shell">
          <h2 id="work-heading" className="text-[0.72rem] font-medium uppercase tracking-[0.22em] text-[#e8c56a]">
            Selected work
          </h2>
          <div className="mt-8 flex flex-col gap-5">
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

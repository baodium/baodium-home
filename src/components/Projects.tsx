import { Mark } from "@/components/Mark";
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
          <Mark index="01" title="Selected work" id="work-heading" />
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

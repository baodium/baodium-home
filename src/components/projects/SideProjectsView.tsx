import { projects } from "@/data/projects";

export function SideProjectsView() {
  return (
    <div className="min-h-[100dvh] bg-[#f4efe8] px-6 pb-24 pt-28 text-[#1c1612] md:px-10 md:pt-36">
      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.2em] text-[#8a7364]">Projects</p>
        <h1 className="mt-4 max-w-[14ch] font-serif text-[clamp(2.75rem,6vw,4.4rem)] leading-[0.98] tracking-[-0.035em]">
          Interview Coach and UpTo
        </h1>
        <p className="mt-6 max-w-xl text-xl leading-relaxed text-[#5c4a40]">
          Interview practice that follows your answers, and one status you update once.
        </p>
        <ul className="mt-16 grid items-stretch gap-6 md:grid-cols-2">
          {projects.map((project) => (
            <li key={project.slug}>
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-full flex-col rounded-2xl border border-[#e4d5c4] bg-[#fbf7f1] px-8 py-10 transition-colors hover:border-[#b4532a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b4532a] sm:px-10 sm:py-12"
              >
                <span className="text-base font-medium text-[#b4532a]">{project.status}</span>
                <span className="mt-5 font-serif text-[2.35rem] leading-none tracking-[-0.03em]">
                  {project.name}
                </span>
                <span className="mt-5 max-w-[34ch] text-lg leading-relaxed text-[#3d322c]">
                  {project.description}
                </span>
                <span className="mt-10 inline-flex w-fit items-center gap-2 border border-[#b4532a] px-4 py-2.5 text-base font-medium text-[#b4532a]">
                  Open {project.name}
                  <span aria-hidden="true">→</span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

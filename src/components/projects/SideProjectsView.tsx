"use client";

import { projects } from "@/data/projects";

export function SideProjectsView() {
  return (
    <div className="min-h-[100dvh] bg-[#f3eee6] px-5 pb-20 pt-28 text-[#241c18] md:pt-32">
      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[#8a7364]">Projects</p>
        <h1 className="mt-3 max-w-[16ch] font-serif text-[clamp(2.2rem,5vw,3.4rem)] leading-[1.02] tracking-[-0.03em]">
          Interview Coach and UpTo
        </h1>
        <ul className="mt-12 grid items-stretch gap-6 md:grid-cols-2">
          {projects.map((project) => (
            <li key={project.slug}>
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-full min-h-[22rem] flex-col justify-between rounded-[999px] border border-[#e6d8c8] bg-[#fbf7f1] px-10 py-12 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_24px_40px_-32px_rgba(70,48,28,0.45)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_28px_48px_-30px_rgba(70,48,28,0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b4532a] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <span>
                  <span className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-[#8a7364]">
                    {project.status}
                  </span>
                  <span className="mt-5 block font-serif text-[clamp(1.8rem,3vw,2.4rem)] leading-none tracking-[-0.03em]">
                    {project.name}
                  </span>
                </span>
                <span className="project-blurb mt-8 block max-w-[28ch] font-serif text-[1.05rem] italic leading-snug text-[#5c4a40]">
                  {project.description}
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

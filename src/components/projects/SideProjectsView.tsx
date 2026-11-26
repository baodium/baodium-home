import Link from "next/link";
import { projects } from "@/data/projects";

const featured = projects.find((project) => project.featured) ?? projects[0];
const rest = projects.filter((project) => project.slug !== featured.slug);

export function SideProjectsView() {
  return (
    <div className="min-h-[100dvh] bg-[#f6f8f7] px-6 pb-28 pt-28 text-[#18201c] md:px-10 md:pt-32">
      <div className="mx-auto max-w-5xl">
        <p className="text-base font-medium text-[#8d3d2c]">Projects</p>
        <h1 className="mt-5 max-w-[16em] font-[family-name:var(--font-geist)] text-[clamp(2.6rem,5vw,4.15rem)] font-medium leading-[1.15] tracking-[-0.02em]">
          Interview Coach, UpTo, and the labs
        </h1>
        <ul className="mt-20 border-t border-[#e6ddd2]">
          <li>
            <a
              href={featured.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group grid gap-8 border-b border-[#e6ddd2] py-12 transition-colors duration-200 hover:bg-[#fffdf9] md:grid-cols-[minmax(0,1.4fr)_auto] md:items-end md:py-16"
            >
              <span>
                <span className="text-base font-medium text-[#8d3d2c]">{featured.status}</span>
                <span className="mt-5 block font-[family-name:var(--font-geist)] text-[clamp(2.2rem,3.5vw,3.1rem)] font-medium leading-[1.2] tracking-[-0.02em]">
                  {featured.name}
                </span>
                <span className="mt-4 block max-w-xl text-lg leading-relaxed text-[#3d322c]">
                  {featured.description}
                </span>
              </span>
              <span className="inline-flex items-center gap-2 text-base font-semibold text-[#8d3d2c] transition-transform duration-200 group-hover:translate-x-1.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0">
                Open {featured.name}
                <span aria-hidden="true">→</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </span>
            </a>
          </li>
          {rest.map((project) => (
            <li key={project.slug}>
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group grid gap-6 border-b border-[#e6ddd2] py-12 transition-colors duration-200 hover:bg-[#fffdf9] md:grid-cols-[minmax(0,1.4fr)_auto] md:items-end"
              >
                <span>
                  <span className="text-base font-medium text-[#8d3d2c]">{project.status}</span>
                  <span className="mt-4 block font-[family-name:var(--font-geist)] text-[clamp(1.85rem,2.4vw,2.35rem)] font-medium leading-[1.2] tracking-[-0.02em]">
                    {project.name}
                  </span>
                  <span className="mt-4 block max-w-xl text-lg leading-relaxed text-[#5c514a]">
                    {project.description}
                  </span>
                </span>
                <span className="inline-flex items-center gap-2 text-base font-semibold text-[#8d3d2c] transition-transform duration-200 group-hover:translate-x-1.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0">
                  Open {project.name}
                  <span aria-hidden="true">→</span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </span>
              </a>
            </li>
          ))}
          <li>
            <Link
              href="/labs"
              className="group grid gap-6 border-b border-[#e6ddd2] py-12 transition-colors duration-200 hover:bg-[#fffdf9] md:grid-cols-[minmax(0,1.4fr)_auto] md:items-end"
            >
              <span>
                <span className="text-base font-medium text-[#8d3d2c]">In the browser</span>
                <span className="mt-4 block font-[family-name:var(--font-geist)] text-[clamp(1.85rem,2.4vw,2.35rem)] font-medium leading-[1.2] tracking-[-0.02em]">
                  Labs
                </span>
                <span className="mt-4 block max-w-xl text-lg leading-relaxed text-[#5c514a]">
                  Guided SRE walkthroughs, 30 coding exercises, and a real five-service observability lab with evidence checkpoints.
                </span>
              </span>
              <span className="inline-flex items-center gap-2 text-base font-semibold text-[#8d3d2c] transition-transform duration-200 group-hover:translate-x-1.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0">
                Open Labs
                <span aria-hidden="true">→</span>
              </span>
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}

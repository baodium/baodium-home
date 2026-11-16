import Link from "next/link";
import { projects } from "@/data/projects";

const featured = projects.find((project) => project.featured) ?? projects[0];
const rest = projects.filter((project) => project.slug !== featured.slug);

export function SideProjectsView() {
  return (
    <div className="min-h-[100dvh] bg-[#fbf7f1] px-6 pb-28 pt-28 text-[#241c18] md:px-10 md:pt-32">
      <div className="mx-auto max-w-5xl">
        <p className="text-base font-medium text-[#8d3d2c]">Projects</p>
        <h1 className="mt-4 max-w-[14ch] font-[family-name:var(--font-lab-serif)] text-[clamp(2.8rem,6vw,4.6rem)] font-medium leading-[1.05] tracking-[-0.03em]">
          Open Interview Coach, UpTo, or the labs
        </h1>
        <p className="mt-6 max-w-xl text-xl leading-relaxed text-[#5c514a]">
          Interview practice, one status written once, and the checkout labs.
        </p>
        <ul className="mt-16 border-t border-[#e6ddd2]">
          <li>
            <a
              href={featured.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group grid gap-8 border-b border-[#e6ddd2] py-10 transition-colors duration-200 hover:bg-[#fffdf9] md:grid-cols-[minmax(0,1.4fr)_auto] md:items-end md:py-14"
            >
              <span>
                <span className="text-base font-medium text-[#8d3d2c]">{featured.status}</span>
                <span className="mt-4 block font-[family-name:var(--font-lab-serif)] text-[clamp(2.4rem,4vw,3.4rem)] font-medium leading-[1.1] tracking-[-0.03em]">
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
          <li className="grid md:grid-cols-2">
            {rest.map((project) => (
              <a
                key={project.slug}
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group border-b border-[#e6ddd2] py-8 pr-6 transition-colors duration-200 hover:bg-[#fffdf9] md:py-10"
              >
                <span className="text-base font-medium text-[#8d3d2c]">{project.status}</span>
                <span className="mt-3 block font-[family-name:var(--font-lab-serif)] text-[1.85rem] font-medium leading-tight tracking-[-0.02em]">
                  {project.name}
                </span>
                <span className="mt-3 block max-w-md text-base leading-relaxed text-[#5c514a]">
                  {project.description}
                </span>
                <span className="mt-6 inline-flex items-center gap-2 text-base font-semibold text-[#8d3d2c] transition-transform duration-200 group-hover:translate-x-1.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0">
                  Open {project.name}
                  <span aria-hidden="true">→</span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </span>
              </a>
            ))}
            <Link
              href="/labs"
              className="group border-b border-[#e6ddd2] py-8 transition-colors duration-200 hover:bg-[#fffdf9] md:border-l md:border-[#e6ddd2] md:py-10 md:pl-8"
            >
              <span className="text-base font-medium text-[#8d3d2c]">In the browser</span>
              <span className="mt-3 block font-[family-name:var(--font-lab-serif)] text-[1.85rem] font-medium leading-tight tracking-[-0.02em]">
                Labs
              </span>
              <span className="mt-3 block max-w-md text-base leading-relaxed text-[#5c514a]">
                Open the checkout labs. You name the slow hop, spend a 99.5 percent budget, and decide when a failure should page.
              </span>
              <span className="mt-6 inline-flex items-center gap-2 text-base font-semibold text-[#8d3d2c] transition-transform duration-200 group-hover:translate-x-1.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0">
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

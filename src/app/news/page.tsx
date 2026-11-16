import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Navigation } from "@/components/Navigation";
import { newsStories, type NewsStory } from "@/data/news";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "News",
  description:
    "Public notes on the OAU scholarship, Practical System Design, the COSMOS research award, the dissertation, and Queen Tonight.",
  alternates: { canonical: `${site.url}/news` },
  openGraph: {
    title: "News · Baodium",
    description:
      "Public notes on the OAU scholarship, Practical System Design, the COSMOS research award, the dissertation, and Queen Tonight.",
    url: `${site.url}/news`,
  },
};

export default function NewsPage() {
  const [lead, scholarship, ...rest] = newsStories;
  return (
    <>
      <Navigation />
      <main id="main" className="min-h-[100dvh] bg-[#fbf7f1] px-6 pb-28 pt-28 text-[#241c18] md:px-10 md:pt-32">
        <div className="mx-auto max-w-5xl">
          <p className="text-base font-medium text-[#8d3d2c]">News</p>
          <h1 className="mt-4 max-w-[16ch] font-[family-name:var(--font-lab-serif)] text-[clamp(2.8rem,6vw,4.6rem)] font-medium leading-[1.05] tracking-[-0.03em]">
            From the public record
          </h1>
          <p className="mt-6 max-w-xl text-xl leading-relaxed text-[#5c514a]">
            Scholarship, the book, research, an award, and a song. Each note links out to the publisher.
          </p>

          <Featured story={lead} banner />
          <Featured story={scholarship} reverse />

          <ul className="mt-4 grid gap-x-12 border-t border-[#e6ddd2] md:grid-cols-2">
            {rest.map((story) => (
              <li key={story.id} className="border-b border-[#e6ddd2] py-8 md:py-10">
                <StoryCard story={story} />
              </li>
            ))}
          </ul>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Featured({
  story,
  reverse = false,
  banner = false,
}: {
  story: NewsStory;
  reverse?: boolean;
  banner?: boolean;
}) {
  return (
    <article className="mt-16 border-t border-[#e6ddd2] py-10 md:py-14">
      <div className={banner ? "grid gap-8" : `grid items-center gap-8 md:grid-cols-2 md:gap-12 ${reverse ? "md:[&>a]:order-2" : ""}`}>
        <StoryFigure story={story} banner={banner} />
        <div className={banner ? "max-w-2xl" : ""}>
          <StoryMeta story={story} />
          <h2 className="mt-3 font-[family-name:var(--font-lab-serif)] text-[clamp(2rem,3vw,2.8rem)] font-medium leading-[1.12] tracking-[-0.03em]">
            <a href={story.href} target="_blank" rel="noopener noreferrer" className="hover:text-[#8d3d2c]">
              {story.title}
            </a>
          </h2>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-[#3d322c]">{story.blurb}</p>
          <StoryLinks story={story} />
        </div>
      </div>
    </article>
  );
}

function StoryCard({ story }: { story: NewsStory }) {
  return (
    <article className="group">
      <StoryFigure story={story} />
      <StoryMeta story={story} />
      <h2 className="mt-3 font-[family-name:var(--font-lab-serif)] text-[1.7rem] font-medium leading-tight tracking-[-0.02em]">
        <a href={story.href} target="_blank" rel="noopener noreferrer" className="transition-colors group-hover:text-[#8d3d2c]">
          {story.title}
        </a>
      </h2>
      <p className="mt-3 text-base leading-relaxed text-[#5c514a]">{story.blurb}</p>
      <StoryLinks story={story} />
    </article>
  );
}

function StoryMeta({ story }: { story: NewsStory }) {
  return (
    <p className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-base">
      <span className="font-medium text-[#8d3d2c]">{story.kind}</span>
      <time dateTime={story.date} className="text-[#5c514a]">
        {story.dateLabel}
      </time>
      <span className="text-[#5c514a]">{story.source}</span>
    </p>
  );
}

function StoryFigure({ story, banner = false }: { story: NewsStory; banner?: boolean }) {
  const frame = banner
    ? ""
    : "aspect-[4/3]";
  if (!story.image) {
    return (
      <div className={`flex ${frame} items-center bg-[#f4efe8] p-8`}>
        <p className="font-[family-name:var(--font-lab-serif)] text-4xl font-medium tracking-[-0.03em] text-[#8d3d2c]">
          PhD
          <span className="mt-2 block text-lg font-normal text-[#5c514a]">UA Little Rock, 2020</span>
        </p>
      </div>
    );
  }
  return (
    <a
      href={story.href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group block bg-[#f4efe8] ${banner || story.fit === "contain" ? "" : `overflow-hidden ${frame}`}`}
    >
      <img
        src={story.image}
        alt={story.imageAlt}
        className={`w-full ${
          banner || story.fit === "contain"
            ? "h-auto object-contain"
            : "h-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        }`}
      />
    </a>
  );
}

function StoryLinks({ story }: { story: NewsStory }) {
  return (
    <div className="mt-5">
      <a
        href={story.href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-base font-semibold text-[#8d3d2c] transition-transform duration-200 hover:translate-x-1.5 motion-reduce:transition-none motion-reduce:hover:translate-x-0"
      >
        {story.linkLabel}
        <span aria-hidden="true">→</span>
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
      {story.also?.length ? (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-base text-[#5c514a]">
          {story.also.map((link) => (
            <li key={link.href}>
              <a href={link.href} target="_blank" rel="noopener noreferrer" className="underline decoration-[#e6ddd2] underline-offset-4 hover:text-[#241c18]">
                {link.label}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-3 text-sm leading-relaxed text-[#6f625a]">{story.credit}</p>
    </div>
  );
}

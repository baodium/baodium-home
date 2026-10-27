import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Navigation } from "@/components/Navigation";
import { site } from "@/data/site";

/**
 * Lightweight route so nav → /about never 404s.
 * Full About craft is owned by a sibling worker — keep this stub thin.
 */
export const metadata: Metadata = {
  title: "About",
  description: `About ${site.credit} and Baodium — products, the book, and reliability drills.`,
  alternates: { canonical: `${site.url}/about` },
};

export default function AboutPage() {
  return (
    <>
      <Navigation />
      <main id="main" className="relative min-h-[70vh] bg-cream text-ink">
        <section className="shell pb-24 pt-32 md:pb-32 md:pt-40">
          <p className="kicker text-cinnabar">About</p>
          <h1 className="mt-5 max-w-[16ch] font-serif text-[clamp(2.6rem,6vw,4.75rem)] italic leading-[0.98] tracking-[-0.035em]">
            {site.credit}
          </h1>
          <p className="mt-6 max-w-xl text-[1.08rem] leading-relaxed text-muted">
            Baodium is his home for products and technical publishing. A fuller
            About page is on the way — meanwhile, the book, projects, and
            interactive hub are live.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/#book"
              className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-[0.92rem] font-medium text-cream transition-colors hover:bg-cinnabar"
            >
              Read the book
            </Link>
            <Link
              href="/projects"
              className="inline-flex min-h-11 items-center rounded-full border border-ink/15 px-5 text-[0.92rem] text-ink transition-colors hover:border-cinnabar/40 hover:text-cinnabar"
            >
              Side projects
            </Link>
            <Link
              href="/play"
              className="inline-flex min-h-11 items-center rounded-full border border-ink/15 px-5 text-[0.92rem] text-ink transition-colors hover:border-cinnabar/40 hover:text-cinnabar"
            >
              Interactive hub
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

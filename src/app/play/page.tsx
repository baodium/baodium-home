import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { SloWatchGame } from "@/components/SloWatchGame";
import { site } from "@/data/site";
import { book } from "@/data/writing";

export const metadata: Metadata = {
  title: "SLO Watch",
  description:
    "Keep Baodium checkout inside the SLO through traffic spikes, pool saturation, and retry storms. A reliability game from Practical System Design.",
  alternates: { canonical: `${site.url}/play` },
  openGraph: {
    title: "SLO Watch — Baodium",
    description:
      "Hold the SLO under load. Size the pool, pick retries, survive the cascade — then read the chapter.",
    url: `${site.url}/play`,
  },
};

export default function PlayPage() {
  return (
    <>
      <header className="border-b border-ink/10 bg-cream">
        <div className="shell flex items-center justify-between gap-4 py-4 text-ink">
          <Link href="/" className="font-mono text-[0.72rem] tracking-[0.28em]">
            BAODIUM
          </Link>
          <Link
            href={book.readPath}
            className="text-[0.84rem] text-cinnabar transition-colors hover:text-ink"
          >
            Free book →
          </Link>
        </div>
      </header>
      <main id="main" className="bg-cream pb-16 pt-10 text-ink md:pb-24 md:pt-14">
        <div className="shell">
          <div className="grain overflow-hidden rounded-[2rem] bg-ember p-5 text-cream md:rounded-[3rem] md:p-10">
            <SloWatchGame compact />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { SloWatchGame } from "@/components/SloWatchGame";
import { site } from "@/data/site";

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
      <header className="border-b border-line">
        <div className="shell flex items-center justify-between gap-4 py-4">
          <Link href="/" className="text-[0.78rem] tracking-[0.24em] text-ink">
            BAODIUM
          </Link>
          <Link href="/#book" className="text-[0.84rem] text-bronze hover:text-ink">
            Free book →
          </Link>
        </div>
      </header>
      <main id="main" className="section">
        <div className="shell">
          <SloWatchGame compact />
        </div>
      </main>
      <Footer />
    </>
  );
}

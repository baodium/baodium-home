import type { Metadata } from "next";
import { PlayChrome } from "@/components/play/PlayChrome";
import { PlayHub } from "@/components/play/PlayHub";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Drills",
  description:
    "Short reliability drills from Practical System Design: SLO Watch, Traffic Surge, Cascade, Cache Roulette, and Tail Latency.",
  alternates: { canonical: `${site.url}/play` },
  openGraph: {
    title: "Drills · Baodium",
    description:
      "Five reliability drills from Practical System Design, each running on a simulated service you can change while it runs.",
    url: `${site.url}/play`,
  },
};

export default function PlayPage() {
  return (
    <PlayChrome>
      <PlayHub />
    </PlayChrome>
  );
}

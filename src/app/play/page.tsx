import type { Metadata } from "next";
import { PlayChrome } from "@/components/play/PlayChrome";
import { PlayHub } from "@/components/play/PlayHub";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Play",
  description:
    "Choose a Baodium reliability game — SLO Watch, Traffic Surge, Cascade, Cache Roulette, Tail Latency. Learn system design by doing.",
  alternates: { canonical: `${site.url}/play` },
  openGraph: {
    title: "Play — Baodium",
    description:
      "Pick a game. Feel the failure mode. Short SRE drills from Practical System Design.",
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

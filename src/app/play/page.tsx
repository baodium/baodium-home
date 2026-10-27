import type { Metadata } from "next";
import { PlayChrome } from "@/components/play/PlayChrome";
import { PlayHub } from "@/components/play/PlayHub";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Play — Interactive hub",
  description:
    "Baodium interactive hub — SLO Watch, Traffic Surge, Cascade, Cache Roulette, Tail Latency. Short reliability drills that walk a failure mode, then name what you saw.",
  alternates: { canonical: `${site.url}/play` },
  openGraph: {
    title: "Play — Interactive hub · Baodium",
    description:
      "Pick a drill. Experience the impact of the failure mode. Short SRE drills from Practical System Design.",
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

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
      "Pick a drill. Tune the levers, watch the meters, and leave with a production takeaway.",
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

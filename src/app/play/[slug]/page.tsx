import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LearningShell } from "@/components/learning/LearningShell";
import { CacheRouletteGame } from "@/components/play/CacheRouletteGame";
import { CascadeGame } from "@/components/play/CascadeGame";
import { TailLatencyGame } from "@/components/play/TailLatencyGame";
import { TrafficSurgeGame } from "@/components/play/TrafficSurgeGame";
import { SloWatchGame } from "@/components/SloWatchGame";
import { getPlayGame, playGames } from "@/data/play-games";
import { site } from "@/data/site";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return playGames.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const game = getPlayGame(slug);
  if (!game) return {};
  return {
    title: game.title,
    description: `${game.feel} So what: ${game.matters}`,
    alternates: { canonical: `${site.url}/play/${game.slug}` },
    openGraph: {
      title: `${game.title} · Baodium Play`,
      description: game.matters,
      url: `${site.url}/play/${game.slug}`,
    },
  };
}

function GameBySlug({ slug }: { slug: string }) {
  switch (slug) {
    case "slo-watch":
      return <SloWatchGame compact />;
    case "traffic-surge":
      return <TrafficSurgeGame />;
    case "cascade":
      return <CascadeGame />;
    case "cache-roulette":
      return <CacheRouletteGame />;
    case "tail-latency":
      return <TailLatencyGame />;
    default:
      return null;
  }
}

export default async function PlayGamePage({ params }: Props) {
  const { slug } = await params;
  const game = getPlayGame(slug);
  if (!game) notFound();

  return (
    <LearningShell
      surface="drill"
      title={game.title}
      chapterProseHref={game.chapterHref}
    >
      <div className="shell">
        <div className="drill-stage overflow-hidden rounded-[2rem] p-5 md:rounded-[3rem] md:p-10">
          <GameBySlug slug={slug} />
        </div>
      </div>
    </LearningShell>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShortLabExperience } from "@/components/experience/short/ShortLabExperience";
import { SHORT_LABS, getShortLab } from "@/lib/experience/short-labs";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return SHORT_LABS.map((lab) => ({ slug: lab.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const lab = getShortLab(slug);
  if (!lab) return {};
  return {
    title: `Chapter ${lab.number} lab · ${lab.title}`,
    description: lab.objective,
    alternates: { canonical: `/system-design/experience/${lab.slug}` },
  };
}

export default async function ShortLabPage({ params }: Props) {
  const { slug } = await params;
  const lab = getShortLab(slug);
  if (!lab) notFound();
  return <ShortLabExperience slug={lab.slug} />;
}

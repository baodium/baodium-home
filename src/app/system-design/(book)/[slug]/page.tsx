import { notFound } from "next/navigation";
import { BookChapterView } from "@/components/book/reader/BookChapterView";
import { getAllSlugs, getChapter, getManifest } from "@/lib/book/catalog";
import type { Metadata } from "next";
import { book } from "@/data/writing";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const chapter = getChapter(slug);
  if (!chapter) return {};
  return {
    title: `${chapter.title} — ${book.title}`,
    description: `Read “${chapter.title}” from ${book.title} by ${book.author}.`,
    alternates: { canonical: `${book.readPath}/${slug}` },
  };
}

export default async function SystemDesignChapterPage({ params }: Props) {
  const { slug } = await params;
  const chapter = getChapter(slug);
  const manifest = getManifest();
  if (!chapter || !manifest) notFound();

  const prev = chapter.prev
    ? manifest.chapters.find((c) => c.slug === chapter.prev)
    : null;
  const next = chapter.next
    ? manifest.chapters.find((c) => c.slug === chapter.next)
    : null;

  return (
    <BookChapterView
      chapter={chapter}
      prev={prev ? { slug: prev.slug, title: prev.title } : null}
      next={next ? { slug: next.slug, title: next.title } : null}
    />
  );
}

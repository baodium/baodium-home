import type { Metadata } from "next";
import { BookShell } from "@/components/book/reader/BookShell";
import { getManifest } from "@/lib/book/catalog";
import { book } from "@/data/writing";

const description = `Read ${book.title}: ${book.subtitle}, by ${book.author}. Free to read online.`;

export const metadata: Metadata = {
  title: `Read ${book.title}`,
  description,
  alternates: { canonical: book.readPath },
  openGraph: { title: `Read ${book.title} for free`, description, url: book.readPath },
};

export default function SystemDesignLayout({ children }: { children: React.ReactNode }) {
  const manifest = getManifest();
  const chapters = manifest?.chapters ?? [];

  return (
    <BookShell chapters={chapters}>
      <main id="main">{children}</main>
    </BookShell>
  );
}

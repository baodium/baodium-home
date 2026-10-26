import type { Metadata } from "next";
import { book } from "@/data/writing";
import "katex/dist/katex.min.css";

const description = `Read ${book.title}: ${book.subtitle}, by ${book.author}. Free to read online.`;

export const metadata: Metadata = {
  title: `Read ${book.title}`,
  description,
  alternates: { canonical: book.readPath },
  openGraph: { title: `Read ${book.title} for free`, description, url: book.readPath },
};

/** Shared segment shell — book chrome lives in `(book)/layout`; experience has its own. */
export default function SystemDesignLayout({ children }: { children: React.ReactNode }) {
  return children;
}

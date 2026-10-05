import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { BookReader } from "@/components/book/BookReader";
import { systemDesignPages } from "@/data/system-design-pages";
import { book } from "@/data/writing";

const description = `Read ${book.title}: ${book.subtitle}, by ${book.author}. Free to read online.`;

export const metadata: Metadata = {
  title: `Read ${book.title}`,
  description,
  alternates: { canonical: book.readPath },
  openGraph: { title: `Read ${book.title} for free`, description, url: book.readPath },
};

export default function SystemDesignReader() {
  return (
    <>
      <BookReader pages={systemDesignPages} />
      <Footer />
    </>
  );
}

import Image from "next/image";
import { BookContents } from "@/components/book/reader/BookContents";
import { BookPageTransition } from "@/components/book/reader/BookPageTransition";
import { getManifest } from "@/lib/book/catalog";
import Link from "next/link";

function BookIntroFilm() {
  return (
    <figure className="mx-auto mb-6 w-full max-w-[calc(var(--reader-measure)+3rem)]">
      <Image
        src="/book/book-hero.gif"
        alt="Adewale Obadimu introducing Practical System Design, beside a path from clients through a load balancer, API, cache, and database."
        width={549}
        height={305}
        unoptimized
        priority
        className="block h-auto w-full rounded-[1.15rem] border border-[color-mix(in_srgb,var(--reader-fg)_8%,transparent)]"
      />
      <figcaption className="mt-3 text-sm leading-relaxed text-[var(--reader-muted)]">
        Practical System Design, introduced by Adewale Obadimu.
      </figcaption>
    </figure>
  );
}

export default function SystemDesignIndexPage() {
  const manifest = getManifest();

  if (!manifest || manifest.chapters.length === 0) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="font-serif text-2xl">Reader is building</h1>
        <p className="mt-4 text-[var(--reader-muted)]">
          The manuscript source was not found during the last build. Add{" "}
          <code className="text-sm">Baodium_System_Design_Final_Language_Pass_Web.zip</code> to{" "}
          <code className="text-sm">manuscript/</code> and redeploy.
        </p>
        <Link href="/" className="mt-8 inline-block text-cinnabar underline">
          Back to Baodium
        </Link>
      </div>
    );
  }

  return (
    <BookPageTransition>
      <BookIntroFilm />
      <BookContents chapters={manifest.chapters} />
    </BookPageTransition>
  );
}

import { BookContents } from "@/components/book/reader/BookContents";
import { getManifest } from "@/lib/book/catalog";
import Link from "next/link";

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

  return <BookContents chapters={manifest.chapters} />;
}

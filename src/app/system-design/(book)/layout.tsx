import { BookShell } from "@/components/book/reader/BookShell";
import { getManifest } from "@/lib/book/catalog";

export default function BookReaderLayout({ children }: { children: React.ReactNode }) {
  const manifest = getManifest();
  const chapters = manifest?.chapters ?? [];

  return (
    <BookShell chapters={chapters}>
      <main id="main">{children}</main>
    </BookShell>
  );
}

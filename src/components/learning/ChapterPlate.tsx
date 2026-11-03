import Image from "next/image";
import { figureForChapter } from "@/lib/learning/chapter-figures";

/** A manuscript figure on a paper plate. The parent sets the size. */
export function ChapterPlate({
  chapter,
  className = "",
  sizes = "280px",
  priority = false,
}: {
  chapter: number | string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const figure = figureForChapter(chapter);
  if (!figure) return null;
  return (
    <div className={`chapter-plate relative overflow-hidden ${className}`}>
      <Image
        src={figure.src}
        alt={figure.alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-contain p-2.5"
      />
    </div>
  );
}

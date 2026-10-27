/** Featured book. Title, subtitle, and author are the ones printed on the cover. */
export const book = {
  title: "Practical System Design",
  subtitle: "Building Reliable Systems Through Production Failures",
  author: "Adewale Obadimu",
  href: "https://www.amazon.com/dp/B0H8KKBJRH",
  /** Deep-link to Amazon’s rate/review form (ASIN from href). */
  amazonReviewHref:
    "https://www.amazon.com/review/create-review?asin=B0H8KKBJRH",
  readPath: "/system-design",
  cover: "/projects/practical-system-design.png",
} as const;

export type WritingPiece = {
  title: string;
  description: string;
  href: string;
  date: string;
};

/** Add an essay or write-up as one object. Leave this empty until a real piece exists. */
export const writing: WritingPiece[] = [];

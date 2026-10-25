export type BookSection = {
  id: string;
  title: string;
  level: number;
};

export type BookChapterMeta = {
  slug: string;
  title: string;
  sections: BookSection[];
  prev: string | null;
  next: string | null;
};

export type BookManifest = {
  generatedAt: string;
  zip: string;
  chapters: BookChapterMeta[];
};

export type BookChapter = BookChapterMeta & {
  html: string;
};

export type BookSearchEntry = {
  slug: string;
  title: string;
  excerpt: string;
};

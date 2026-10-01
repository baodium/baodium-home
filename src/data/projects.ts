export type Project = {
  name: string;
  slug: string;
  description: string;
  url: string;
  /** Full-page capture of the live product, 1200px wide; the frame scrolls through it on hover. */
  page: { src: string; height: number };
  tags: string[];
  status: "Live" | "Book" | "In progress";
  featured: boolean;
  tone: "cinnabar" | "amber";
};

export const projects: Project[] = [
  {
    name: "Interview Coach",
    slug: "interview-coach",
    description:
      "An AI-powered interview coaching environment for practicing technical and behavioral interviews.",
    url: "https://interview.baodium.com/",
    page: { src: "/projects/interview-coach-page.jpg", height: 3750 },
    tags: ["AI", "Interviewing"],
    status: "Live",
    featured: true,
    tone: "cinnabar",
  },
  {
    name: "UpTo",
    slug: "upto",
    description:
      "A living status page you update once and share across every social profile.",
    url: "https://upto.baodium.com/",
    page: { src: "/projects/upto-page.jpg", height: 3514 },
    tags: ["Status"],
    status: "Live",
    featured: false,
    tone: "amber",
  },
];

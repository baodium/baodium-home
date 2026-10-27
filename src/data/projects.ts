export type Project = {
  name: string;
  slug: string;
  description: string;
  url: string;
  /** Full-page capture of the live product, 1200px wide; the frame scrolls through it. `origin` skips an empty top, as a fraction of the travel. */
  page: { src: string; height: number; origin?: number };
  tags: string[];
  status: "Live" | "Book" | "In progress";
  featured: boolean;
  tone: "cinnabar" | "amber" | "tide";
};

export const projects: Project[] = [
  {
    name: "Interview Coach",
    slug: "interview-coach",
    description:
      "Practice technical and behavioral interviews with follow-up questions and feedback you can act on.",
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
      "One status page you update once and share across Instagram, LinkedIn, X, and every other profile.",
    url: "https://upto.baodium.com/",
    page: { src: "/projects/upto-page.jpg", height: 3514, origin: 0.34 },
    tags: ["Status"],
    status: "Live",
    featured: false,
    tone: "tide",
  },
];

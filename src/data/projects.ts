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
      "Practice technical and behavioral interviews with follow-up questions and feedback you can use on the next round.",
    url: "https://interview.baodium.com/",
    page: { src: "/projects/interview-coach-page.jpg", height: 5001 },
    tags: ["AI", "Interviewing"],
    status: "Live",
    featured: true,
    tone: "cinnabar",
  },
  {
    name: "UpTo",
    slug: "upto",
    description:
      "One status page you update once, then share the same truth across Instagram, LinkedIn, X, and the rest.",
    url: "https://upto.baodium.com/",
    page: { src: "/projects/upto-page.jpg", height: 3952, origin: 0.28 },
    tags: ["Status"],
    status: "Live",
    featured: false,
    tone: "tide",
  },
];

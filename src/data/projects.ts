export type Project = {
  name: string;
  slug: string;
  description: string;
  url: string;
  image: string;
  tags: string[];
  status: "Live" | "Book" | "In progress";
  featured: boolean;
  tone: "cinnabar" | "moss";
};

export const projects: Project[] = [
  {
    name: "Interview Coach",
    slug: "interview-coach",
    description:
      "An AI-powered interview coaching environment for practicing technical and behavioral interviews.",
    url: "https://interview.baodium.com/",
    image: "/projects/interview-coach.jpg",
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
    image: "/projects/upto.jpg",
    tags: ["Status"],
    status: "Live",
    featured: false,
    tone: "moss",
  },
];

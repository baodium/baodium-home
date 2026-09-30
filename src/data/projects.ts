export type Project = {
  name: string;
  slug: string;
  description: string;
  url: string;
  image: string;
  tags: string[];
  status: "Live" | "Book" | "In progress";
  featured: boolean;
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
  },
];

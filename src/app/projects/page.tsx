import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Navigation } from "@/components/Navigation";
import { SideProjectsView } from "@/components/projects/SideProjectsView";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Recent side projects",
  description:
    "Interview Coach and UpTo — live Baodium side projects for interview practice and a status page that stays true.",
  alternates: { canonical: `${site.url}/projects` },
  openGraph: {
    title: "Recent side projects — Baodium",
    description:
      "Interview Coach and UpTo — live tools for interview practice and status that stays true.",
    url: `${site.url}/projects`,
  },
};

export default function ProjectsPage() {
  return (
    <>
      <Navigation />
      <main id="main" className="relative">
        <SideProjectsView />
      </main>
      <Footer />
    </>
  );
}

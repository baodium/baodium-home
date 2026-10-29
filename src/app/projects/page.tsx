import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Navigation } from "@/components/Navigation";
import { SideProjectsView } from "@/components/projects/SideProjectsView";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Interview Coach and UpTo. Interview practice that follows your answers, and a status page that stays true across every profile.",
  alternates: { canonical: `${site.url}/projects` },
  openGraph: {
    title: "Projects · Baodium",
    description:
      "Interview Coach and UpTo. Interview practice that follows your answers, and a status page that stays true across every profile.",
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

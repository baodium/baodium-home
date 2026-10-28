import type { Metadata } from "next";
import { AboutPageView } from "@/components/about/AboutPageView";
import { Footer } from "@/components/Footer";
import { Navigation } from "@/components/Navigation";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "About",
  description: `${site.credit}. engineer, philanthropist, and author. Baodium is his home for products and technical publishing.`,
  alternates: { canonical: `${site.url}/about` },
  openGraph: {
    title: `About · ${site.credit}`,
    description:
      "Engineer, philanthropist, and author. Baodium is Adewale Obadimu’s home for products and technical publishing.",
    url: `${site.url}/about`,
  },
};

export default function AboutPage() {
  return (
    <>
      <Navigation />
      <main id="main" className="relative">
        <AboutPageView />
      </main>
      <Footer />
    </>
  );
}

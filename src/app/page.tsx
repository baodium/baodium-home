import { BookSection } from "@/components/book/BookSection";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { Navigation } from "@/components/Navigation";
import { PlaySection } from "@/components/PlaySection";
import { Projects } from "@/components/Projects";
import { Writing } from "@/components/Writing";

export default function Home() {
  return (
    <>
      <Navigation />
      <main id="main" className="relative">
        <div className="relative">
          <Hero />
          <Projects />
        </div>
        <BookSection />
        <PlaySection />
        <Writing />
      </main>
      <Footer />
    </>
  );
}

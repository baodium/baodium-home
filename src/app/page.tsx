import { About } from "@/components/About";
import { ExplorationMap } from "@/components/ExplorationMap";
import { Focus } from "@/components/Focus";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { Navigation } from "@/components/Navigation";
import { Projects } from "@/components/Projects";
import { Writing } from "@/components/Writing";

export default function Home() {
  return (
    <>
      <Navigation />
      <main id="main">
        <Hero />
        <Projects />
        <Writing />
        <ExplorationMap />
        <Focus />
        <About />
      </main>
      <Footer />
    </>
  );
}

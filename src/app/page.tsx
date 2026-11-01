import { HomeFrame } from "@/components/hero/HomeFrame";
import { Hero } from "@/components/Hero";
import { Navigation } from "@/components/Navigation";

export default function Home() {
  return (
    <HomeFrame>
      <Navigation />
      <main id="main" className="h-full min-h-0">
        <Hero />
      </main>
    </HomeFrame>
  );
}

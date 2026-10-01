import fs from "node:fs";
import path from "node:path";
import { HeroScene } from "@/components/hero/HeroScene";

export function Hero() {
  const hasVideo = fs.existsSync(path.join(process.cwd(), "public/media/adewale-hero.mp4"));
  return <HeroScene hasVideo={hasVideo} />;
}
